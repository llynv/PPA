import type {
    ActionType,
    AnalysisData,
    BettingRound,
    Card,
    CoachingExplanation,
    Decision,
    DecisionContext,
    HandHistory,
    HeroGrade,
    Mistake,
    MistakeCategory,
    MistakeType,
    PlayerAction,
    Position,
} from "../types/poker";
import { evaluateDecision } from "./poker-engine/decision";
import { getPosition } from "./poker-engine/position";

// ── Session Stats ───────────────────────────────────────────────────

export interface SessionStats {
    totalHands: number;
    averageGrade: HeroGrade;
    totalEvLoss: number;
    averageEvLossPerHand: number;
    biggestMistake: Mistake | null;
    mistakesByRound: Record<BettingRound, number>;
    mistakesByType: Record<string, { count: number; totalEvLoss: number }>;
    mistakesByCategory: Record<string, { count: number; totalEvLoss: number }>;
    weakestType: { type: string; count: number; totalEvLoss: number } | null;
}

// ── Constants ───────────────────────────────────────────────────────

const BETTING_ROUNDS: BettingRound[] = ["preflop", "flop", "turn", "river"];

// ── State Reconstruction Helpers ────────────────────────────────────

/**
 * Get the community cards visible at a given betting round.
 */
function getCommunityCardsForRound(
    allCommunityCards: Card[],
    round: BettingRound,
): Card[] {
    switch (round) {
        case "preflop":
            return [];
        case "flop":
            return allCommunityCards.slice(0, 3);
        case "turn":
            return allCommunityCards.slice(0, 4);
        case "river":
        case "showdown":
            return allCommunityCards.slice(0, 5);
    }
}

/**
 * Estimate the pot size at the point hero made their decision in a round.
 * Sums all amounts from previous rounds + amounts in current round before hero's action.
 */
function getPotAtDecision(
    actions: PlayerAction[],
    heroId: string,
    round: BettingRound,
): number {
    let pot = 0;
    for (const a of actions) {
        const actionRoundIndex = BETTING_ROUNDS.indexOf(a.round);
        const targetRoundIndex = BETTING_ROUNDS.indexOf(round);

        if (actionRoundIndex < targetRoundIndex) {
            // All contributions from previous rounds
            pot += a.amount ?? 0;
        } else if (a.round === round) {
            // Within this round, sum up to (but not including) the hero's action
            if (a.playerId === heroId) break;
            pot += a.amount ?? 0;
        }
    }
    return pot;
}

/**
 * Get the highest bet in the current round (before hero's action).
 * Since action.amount is potDelta (additional chips), we track cumulative
 * contributions per player in this round.
 */
function getHighestBetInRound(
    actions: PlayerAction[],
    heroId: string,
    round: BettingRound,
): number {
    let highestBet = 0;
    const playerBets = new Map<string, number>();

    for (const a of actions) {
        if (a.round !== round) continue;
        if (a.playerId === heroId) break;

        const amount = a.amount ?? 0;
        if (amount > 0) {
            const current = playerBets.get(a.playerId) ?? 0;
            playerBets.set(a.playerId, current + amount);
            highestBet = Math.max(highestBet, current + amount);
        }
    }

    return highestBet;
}

/**
 * Get how much the hero has already bet in this round before their primary action.
 * Since we analyze the hero's first action in each round, this is always 0 —
 * the hero hasn't contributed to this round's betting yet.
 */
function getHeroBetInRound(
    _actions: PlayerAction[],
    _heroId: string,
    _round: BettingRound,
): number {
    // Hero's first action in the round means they haven't bet yet in this round.
    return 0;
}

/**
 * Get the amount the hero needs to call in a given round.
 */
function getAmountToCall(
    actions: PlayerAction[],
    heroId: string,
    round: BettingRound,
): number {
    const highestBet = getHighestBetInRound(actions, heroId, round);
    const heroBet = getHeroBetInRound(actions, heroId, round);
    return Math.max(0, highestBet - heroBet);
}

/**
 * Determine whether the hero was facing a bet/raise on a given round.
 */
function isFacingBet(
    actions: PlayerAction[],
    heroId: string,
    round: BettingRound,
): boolean {
    for (const a of actions) {
        if (a.round !== round) continue;
        if (a.playerId === heroId) break;
        if (a.type === "bet" || a.type === "raise") {
            return true;
        }
    }
    return false;
}

/**
 * Check if hero is first to act in this round.
 */
function isFirstToAct(
    actions: PlayerAction[],
    heroId: string,
    round: BettingRound,
): boolean {
    for (const a of actions) {
        if (a.round !== round) continue;
        // First action in the round — is it the hero?
        return a.playerId === heroId;
    }
    return true;
}

/**
 * Count how many players are still active (not folded) at the point of hero's action.
 */
function getActivePlayers(
    actions: PlayerAction[],
    heroId: string,
    round: BettingRound,
    totalPlayers: number,
): number {
    const folded = new Set<string>();
    const targetRoundIndex = BETTING_ROUNDS.indexOf(round);

    for (const a of actions) {
        const actionRoundIndex = BETTING_ROUNDS.indexOf(a.round);
        if (actionRoundIndex > targetRoundIndex) break;
        if (a.round === round && a.playerId === heroId) break;

        if (a.type === "fold") {
            folded.add(a.playerId);
        }
    }

    return totalPlayers - folded.size;
}

/**
 * Get the action history up to (but not including) hero's action in this round.
 */
function getActionHistory(
    actions: PlayerAction[],
    heroId: string,
    round: BettingRound,
): PlayerAction[] {
    const history: PlayerAction[] = [];
    const targetRoundIndex = BETTING_ROUNDS.indexOf(round);

    for (const a of actions) {
        const actionRoundIndex = BETTING_ROUNDS.indexOf(a.round);
        if (actionRoundIndex > targetRoundIndex) break;
        if (a.round === round && a.playerId === heroId) break;
        history.push(a);
    }

    return history;
}

/**
 * Find the position of the raiser in this round (if any).
 */
function getRaiserPosition(
    actions: PlayerAction[],
    heroId: string,
    round: BettingRound,
    players: { id: string; isDealer: boolean }[],
    numPlayers: number,
    dealerIndex: number,
): Position | undefined {
    let raiserPlayerId: string | undefined;

    for (const a of actions) {
        if (a.round !== round) continue;
        if (a.playerId === heroId) break;
        if (a.type === "bet" || a.type === "raise") {
            raiserPlayerId = a.playerId;
        }
    }

    if (!raiserPlayerId) return undefined;

    const raiserSeatIndex = players.findIndex((p) => p.id === raiserPlayerId);
    if (raiserSeatIndex === -1) return undefined;

    try {
        return getPosition(raiserSeatIndex, dealerIndex, numPlayers);
    } catch {
        return "CO";
    }
}

// ── Action Mapping ──────────────────────────────────────────────────

/**
 * Map an ActionType to its frequency category.
 */
function mapActionToCategory(action: ActionType): "fold" | "call" | "raise" {
    switch (action) {
        case "fold":
            return "fold";
        case "check":
        case "call":
            return "call";
        case "bet":
        case "raise":
            return "raise";
    }
}

// ── Mistake Classification ──────────────────────────────────────────

const MISTAKE_CATEGORY_MAP: Record<MistakeType, MistakeCategory> = {
    OVERFOLD: "FREQUENCY",
    OVERCALL: "FREQUENCY",
    PASSIVE_WITH_EQUITY: "FREQUENCY",
    BAD_SIZING_OVER: "SIZING",
    BAD_SIZING_UNDER: "SIZING",
    MISSED_VALUE_BET: "AGGRESSION",
    MISSED_CBET: "AGGRESSION",
    BLUFF_WRONG_SPOT: "AGGRESSION",
    CALLING_WITHOUT_ODDS: "EQUITY_REALIZATION",
    MISSED_DRAW_PLAY: "EQUITY_REALIZATION",
};

// ── Classification Thresholds ───────────────────────────────────────

const SIZING_OVER_THRESHOLD = 0.5;
const SIZING_UNDER_THRESHOLD = -0.4;
const MIN_DRAW_OUTS_SEMI_BLUFF = 8;
const MIN_OUTS_DRAW_VALUE = 4;
const STRONG_EQUITY_THRESHOLD = 0.60;
const LOW_EQUITY_THRESHOLD = 0.30;

// Note: MISSED_CBET classification requires preflop aggressor context
// not available in the current Decision interface. Will be added when
// preflop history tracking is implemented.

export function classifyMistake(
    decision: Decision,
): { type: MistakeType; category: MistakeCategory } {
    const type = classifyMistakeType(decision);
    return { type, category: MISTAKE_CATEGORY_MAP[type] };
}

function classifyMistakeType(decision: Decision): MistakeType {
    const hero = mapActionToCategory(decision.heroAction);
    const optimal = mapActionToCategory(decision.optimalAction);
    const equity = decision.equity ?? 0;
    const potOdds = decision.potOdds ?? 0;
    const draws = decision.draws;
    const sizing = decision.betSizeAnalysis;

    // 1. Sizing mistakes (same action type, wrong amount)
    if (hero === optimal && sizing) {
        if (sizing.sizingError > SIZING_OVER_THRESHOLD) {
            return "BAD_SIZING_OVER";
        }
        if (sizing.sizingError < SIZING_UNDER_THRESHOLD) {
            return "BAD_SIZING_UNDER";
        }
    }

    // 2. Hero folded, but should have continued
    if (hero === "fold") {
        // Check for missed draw play first
        if (draws && draws.totalOuts >= MIN_DRAW_OUTS_SEMI_BLUFF && optimal === "raise") {
            return "MISSED_DRAW_PLAY";
        }
        return "OVERFOLD";
    }

    // 3. Hero called, but should have folded
    if (hero === "call" && optimal === "fold") {
        // More specific: calling without odds
        if (equity < potOdds && (!draws || draws.totalOuts < MIN_OUTS_DRAW_VALUE)) {
            return "CALLING_WITHOUT_ODDS";
        }
        return "OVERCALL";
    }

    // 4. Hero called, but should have raised
    if (hero === "call" && optimal === "raise") {
        if (equity >= STRONG_EQUITY_THRESHOLD) {
            return "MISSED_VALUE_BET";
        }
        return "PASSIVE_WITH_EQUITY";
    }

    // 5. Hero raised, but should have folded
    if (hero === "raise" && optimal === "fold") {
        return "BLUFF_WRONG_SPOT";
    }

    // 6. Hero raised, but should have called (overaggression)
    if (hero === "raise" && optimal === "call") {
        if (equity < LOW_EQUITY_THRESHOLD && (!draws || draws.totalOuts < MIN_OUTS_DRAW_VALUE)) {
            return "BLUFF_WRONG_SPOT";
        }
        return "MISSED_VALUE_BET";
    }

    // Fallback — should not be reached if called correctly
    return "OVERFOLD";
}

// ── Action Label Formatting ─────────────────────────────────────────

function formatActionLabel(action: ActionType, amount?: number, isAllIn?: boolean): string {
    if (isAllIn && (action === "bet" || action === "raise" || action === "call")) {
        return amount != null && amount > 0 ? `All-in $${amount}` : "All-in";
    }
    const label = action.charAt(0).toUpperCase() + action.slice(1);
    if (amount != null && amount > 0) return `${label} $${amount}`;
    return label;
}

// ── Coaching Explanation Generator ──────────────────────────────────

export function generateCoaching(
    decision: Decision,
    mistakeType: MistakeType,
): CoachingExplanation {
    const heroLabel = formatActionLabel(decision.heroAction, decision.heroAmount, decision.heroIsAllIn);
    const optimalLabel = formatActionLabel(decision.optimalAction, decision.optimalAmount);
    const equityPct = decision.equity != null ? `${Math.round(decision.equity * 100)}%` : "unknown";
    const potOddsPct = decision.potOdds != null ? `${Math.round(decision.potOdds * 100)}%` : null;
    const round = decision.round;

    const whatHappened = `You chose to ${heroLabel.toLowerCase()} on the ${round}.`;

    let whyMistake: string;
    let whatToDo: string;

    switch (mistakeType) {
        case "OVERFOLD":
            whyMistake = potOddsPct
                ? `With ${equityPct} equity and ${potOddsPct} pot odds, you had more than enough equity to continue. Folding here gives up profitable situations.`
                : `With ${equityPct} equity, folding surrenders expected value. The optimal play was to ${optimalLabel.toLowerCase()}.`;
            whatToDo = `In this spot, ${optimalLabel.toLowerCase()} is +EV. Consider your equity relative to pot odds before folding — if your equity exceeds the pot odds, continuing is profitable.`;
            break;
        case "OVERCALL":
            whyMistake = potOddsPct
                ? `With only ${equityPct} equity facing ${potOddsPct} pot odds, you don't have enough equity to call profitably.`
                : `With ${equityPct} equity, calling here is -EV. The pot isn't offering enough to justify continuing.`;
            whatToDo = `Fold when your equity is below the pot odds and you don't have enough implied odds or draws to compensate.`;
            break;
        case "MISSED_VALUE_BET":
            whyMistake = `With ${equityPct} equity, your hand is strong enough to raise for value. By just calling, you miss extracting chips from weaker hands that would pay off a raise.`;
            whatToDo = `Look to raise for value when you have strong equity. Opponents with medium-strength hands will often call, adding to your expected value.`;
            break;
        case "MISSED_CBET":
            whyMistake = `As the preflop aggressor, checking forfeits your range advantage. A continuation bet applies pressure and often takes down the pot immediately.`;
            whatToDo = `Fire a c-bet on favorable board textures when you have the initiative. Even without a strong hand, your preflop raising range gives you credibility.`;
            break;
        case "BAD_SIZING_OVER":
            whyMistake = decision.betSizeAnalysis
                ? `Your bet of ${decision.betSizeAnalysis.heroSize.toFixed(0)} was ${Math.round(decision.betSizeAnalysis.sizingError * 100)}% larger than optimal (${decision.betSizeAnalysis.optimalSize.toFixed(0)}). Oversizing risks too much when called and folds out hands you want action from.`
                : `Your bet was significantly larger than the optimal sizing. Oversizing polarizes your range unnecessarily.`;
            whatToDo = `Size your bets relative to the pot and board texture. On drier boards, smaller bets work well; on wetter boards, size up to deny equity.`;
            break;
        case "BAD_SIZING_UNDER":
            whyMistake = decision.betSizeAnalysis
                ? `Your bet of ${decision.betSizeAnalysis.heroSize.toFixed(0)} was ${Math.abs(Math.round(decision.betSizeAnalysis.sizingError * 100))}% smaller than optimal (${decision.betSizeAnalysis.optimalSize.toFixed(0)}). Undersizing gives opponents a cheap price to draw out.`
                : `Your bet was significantly smaller than optimal. Small bets give opponents too good a price to continue.`;
            whatToDo = `Size up when the board is wet or when you're value betting. Giving opponents incorrect odds to call is how you maximize EV.`;
            break;
        case "CALLING_WITHOUT_ODDS":
            whyMistake = potOddsPct
                ? `With ${equityPct} equity and ${potOddsPct} pot odds, you're calling without the math on your side. Without significant draws, this is a losing play.`
                : `With ${equityPct} equity and no meaningful draws, calling here bleeds chips over time.`;
            whatToDo = `Only call when your equity (including draw outs and implied odds) exceeds the pot odds. When the math doesn't work, fold and save chips for better spots.`;
            break;
        case "BLUFF_WRONG_SPOT":
            whyMistake = `With only ${equityPct} equity and no draws on a ${decision.boardTexture?.wetness ?? ""} board, raising here has very little fold equity and almost no backup plan if called.`;
            whatToDo = `Pick better bluffing spots: boards that favor your perceived range, positions with more fold equity, or situations where you have backdoor draws as backup.`;
            break;
        case "MISSED_DRAW_PLAY":
            whyMistake = decision.draws
                ? `You have ${decision.draws.totalOuts} outs (${(decision.draws.drawEquity * 100).toFixed(0)}% draw equity). With a strong draw, playing aggressively builds the pot for when you hit and can win the pot immediately through fold equity.`
                : `With a strong drawing hand, playing passively misses the opportunity to semi-bluff and build fold equity.`;
            whatToDo = `With 8+ outs, consider semi-bluffing. Raising with a draw puts pressure on opponents and gives you two ways to win: they fold, or you hit your draw.`;
            break;
        case "PASSIVE_WITH_EQUITY":
            whyMistake = `With ${equityPct} equity, just calling is too passive. You have a strong enough hand to raise, which builds the pot and pressures opponents with weaker holdings.`;
            whatToDo = `When you have 55%+ equity, lean toward raising. Passive play with strong hands lets opponents see cheap cards and outdraw you.`;
            break;
    }

    return { whatHappened, whyMistake, whatToDo, concept: mistakeType };
}

// ── Grade Calculation ───────────────────────────────────────────────

function calculateGrade(totalEvLoss: number): HeroGrade {
    if (totalEvLoss <= 0.5) return "A+";
    if (totalEvLoss <= 1.5) return "A";
    if (totalEvLoss <= 3) return "A-";
    if (totalEvLoss <= 5) return "B+";
    if (totalEvLoss <= 8) return "B";
    if (totalEvLoss <= 12) return "B-";
    if (totalEvLoss <= 18) return "C+";
    if (totalEvLoss <= 25) return "C";
    if (totalEvLoss <= 35) return "C-";
    if (totalEvLoss <= 50) return "D";
    return "F";
}

// ── Severity ────────────────────────────────────────────────────────

function determineSeverity(evLoss: number): "minor" | "moderate" | "major" {
    if (evLoss < 2) return "minor";
    if (evLoss <= 8) return "moderate";
    return "major";
}

// ── Big Blind Estimation ────────────────────────────────────────────

/**
 * Estimate the big blind from preflop actions.
 * Falls back to 2 if unable to determine.
 */
function estimateBigBlind(actions: PlayerAction[]): number {
    const preflopBets = actions
        .filter(
            (a) => a.round === "preflop" && a.amount != null && a.amount > 0,
        )
        .map((a) => a.amount!);

    if (preflopBets.length >= 2) {
        preflopBets.sort((a, b) => a - b);
        return preflopBets[1] ?? preflopBets[0] ?? 2;
    }

    if (preflopBets.length === 1) {
        return preflopBets[0];
    }

    return 2;
}

// ── Main Analysis Function ──────────────────────────────────────────

/**
 * Analyzes a completed hand and generates deterministic GTO-based feedback
 * using the decision engine.
 */
export function analyzeHand(handHistory: HandHistory): AnalysisData {
    const hero = handHistory.players.find((p) => p.isHero);

    if (!hero) {
        return {
            heroGrade: "A+",
            decisions: [],
            totalEvLoss: 0,
            totalHeroEv: 0,
            mistakes: [],
            handNumber: handHistory.handNumber,
        };
    }

    const holeCards = hero.holeCards;
    const communityCards = handHistory.communityCards;
    const actions = handHistory.actions;
    const players = handHistory.players;
    const numPlayers = players.length;

    const bigBlind = handHistory.bigBlind ?? estimateBigBlind(actions);

    // Find dealer index — fall back to 0 if no dealer marked
    const dealerPlayer = players.find((p) => p.isDealer);
    const dealerIndex = dealerPlayer
        ? players.indexOf(dealerPlayer)
        : -1;

    // Determine hero's seat index and position
    const heroSeatIndex = players.indexOf(hero);
    let heroPosition: Position;
    if (dealerIndex >= 0 && numPlayers >= 2 && numPlayers <= 9) {
        try {
            heroPosition = getPosition(heroSeatIndex, dealerIndex, numPlayers);
        } catch {
            heroPosition = "CO";
        }
    } else {
        heroPosition = "CO";
    }

    const decisions: Decision[] = [];
    const mistakes: Mistake[] = [];

    // Detect which round the hero went all-in (if at all).
    // Hero's final state has isAllIn — find the last round they acted in.
    let heroAllInRound: BettingRound | null = null;
    if (hero.isAllIn) {
        for (let i = BETTING_ROUNDS.length - 1; i >= 0; i--) {
            const round = BETTING_ROUNDS[i];
            const acted = actions.some(
                (a) =>
                    a.playerId === hero.id &&
                    a.round === round &&
                    (a.type === "bet" ||
                        a.type === "raise" ||
                        a.type === "call"),
            );
            if (acted) {
                heroAllInRound = round;
                break;
            }
        }
    }

    // Analyze each round where hero acted
    for (const round of BETTING_ROUNDS) {
        const heroActions = actions.filter(
            (a) => a.playerId === hero.id && a.round === round,
        );

        if (heroActions.length === 0) continue;

        // Take the hero's primary action in this round
        const heroAction = heroActions[0];

        // Reconstruct game state at the point of hero's decision
        const pot = getPotAtDecision(actions, hero.id, round);
        const toCall = getAmountToCall(actions, hero.id, round);
        const currentBet = getHighestBetInRound(actions, hero.id, round);
        const visibleCards = getCommunityCardsForRound(communityCards, round);
        const facingBet = isFacingBet(actions, hero.id, round);
        const firstToAct = isFirstToAct(actions, hero.id, round);
        const numActivePlayers = getActivePlayers(
            actions,
            hero.id,
            round,
            numPlayers,
        );
        const actionHistory = getActionHistory(actions, hero.id, round);
        const raiserPosition = getRaiserPosition(
            actions,
            hero.id,
            round,
            players,
            numPlayers,
            dealerIndex >= 0 ? dealerIndex : 0,
        );

        // Build DecisionContext
        const ctx: DecisionContext = {
            holeCards,
            communityCards: visibleCards,
            position: heroPosition,
            round,
            pot: Math.max(pot, bigBlind), // ensure minimum pot of 1 BB
            toCall,
            currentBet,
            stack: hero.stack,
            bigBlind,
            numActivePlayers,
            numPlayersInHand: numActivePlayers,
            isFirstToAct: firstToAct,
            facingRaise: facingBet,
            raiserPosition,
            actionHistory,
        };

        // Call the decision engine
        const result = evaluateDecision(ctx);

        // Calculate EV diff from evByAction
        const heroCategory = mapActionToCategory(heroAction.type);
        const heroEv = result.evByAction[heroCategory];

        // Find the max EV (optimal) from evByAction
        const maxEv = Math.max(
            result.evByAction.fold,
            result.evByAction.call,
            result.evByAction.raise,
        );

        // EV loss = EV(optimal action) - EV(hero's action), in BB
        const evDiffRaw = maxEv - heroEv;
        const evDiffInBB =
            bigBlind > 0 ? evDiffRaw / bigBlind : evDiffRaw;
        const evDiff = Math.max(0, Math.round(evDiffInBB * 100) / 100);

        // Hero's actual EV in BB (positive = profitable decision)
        const heroEvInBB = bigBlind > 0 ? heroEv / bigBlind : heroEv;
        const heroEvRounded = Math.round(heroEvInBB * 100) / 100;

        // Build bet size analysis when hero bet or raised
        let betSizeAnalysis: Decision["betSizeAnalysis"];
        if (
            (heroAction.type === "bet" || heroAction.type === "raise") &&
            heroAction.amount != null &&
            heroAction.amount > 0 &&
            result.optimalAmount != null &&
            result.optimalAmount > 0
        ) {
            const heroSize = heroAction.amount;
            const optimalSize = result.optimalAmount;
            betSizeAnalysis = {
                heroSize,
                optimalSize,
                sizingError: (heroSize - optimalSize) / optimalSize,
            };
        }

        const decision: Decision = {
            round,
            heroAction: heroAction.type,
            heroAmount: heroAction.amount,
            optimalAction: result.optimalAction,
            optimalAmount: result.optimalAmount,
            optimalFrequencies: result.frequencies,
            evDiff,
            heroEv: heroEvRounded,
            equity: result.equity,
            potOdds: result.potOdds,
            spr: result.spr,
            draws: result.draws,
            boardTexture: result.boardTexture,
            reasoning: result.reasoning,
            evByAction: result.evByAction,
            betSizeAnalysis,
            heroIsAllIn: heroAllInRound === round,
            coaching: null,  // populated below if mistake detected
        };

        decisions.push(decision);

        // Generate mistake if hero deviated from optimal.
        // Skip if hero's action is a viable mixed-strategy play (>= 20% frequency).
        const heroFrequency = result.frequencies[heroCategory];
        if (evDiff > 0 && heroFrequency < 0.2) {
            const { type: mistakeType, category: mistakeCategory } = classifyMistake(decision);
            const coaching = generateCoaching(decision, mistakeType);

            // Attach coaching to the decision
            decision.coaching = coaching;

            const description = result.reasoning;

            mistakes.push({
                round,
                description,
                severity: determineSeverity(evDiff),
                evLoss: evDiff,
                heroAction: heroAction.type,
                optimalAction: result.optimalAction,
                type: mistakeType,
                category: mistakeCategory,
            });
        }
    }

    const totalEvLoss = decisions.reduce((sum, d) => sum + d.evDiff, 0);
    const totalHeroEv = decisions.reduce((sum, d) => sum + (d.heroEv ?? 0), 0);
    const heroGrade = calculateGrade(totalEvLoss);

    return {
        heroGrade,
        decisions,
        totalEvLoss: Math.round(totalEvLoss * 100) / 100,
        totalHeroEv: Math.round(totalHeroEv * 100) / 100,
        mistakes,
        handNumber: handHistory.handNumber,
    };
}

// ── Session Stats ───────────────────────────────────────────────────

const GRADE_VALUES: Record<HeroGrade, number> = {
    "A+": 12,
    A: 11,
    "A-": 10,
    "B+": 9,
    B: 8,
    "B-": 7,
    "C+": 6,
    C: 5,
    "C-": 4,
    D: 3,
    F: 1,
};

const VALUE_TO_GRADE: [number, HeroGrade][] = [
    [11.5, "A+"],
    [10.5, "A"],
    [9.5, "A-"],
    [8.5, "B+"],
    [7.5, "B"],
    [6.5, "B-"],
    [5.5, "C+"],
    [4.5, "C"],
    [3.5, "C-"],
    [2, "D"],
    [0, "F"],
];

function gradeFromAverage(avg: number): HeroGrade {
    for (const [threshold, grade] of VALUE_TO_GRADE) {
        if (avg >= threshold) return grade;
    }
    return "F";
}

/**
 * Calculates aggregate statistics across multiple analyzed hands.
 */
export function getSessionStats(analyses: AnalysisData[]): SessionStats {
    const totalHands = analyses.length;

    const totalEvLoss = analyses.reduce((sum, a) => sum + a.totalEvLoss, 0);
    const averageEvLossPerHand = totalHands > 0 ? totalEvLoss / totalHands : 0;

    // Average grade
    const gradeSum = analyses.reduce(
        (sum, a) => sum + GRADE_VALUES[a.heroGrade],
        0,
    );
    const averageGradeValue = totalHands > 0 ? gradeSum / totalHands : 12;
    const averageGrade = gradeFromAverage(averageGradeValue);

    // Find biggest mistake
    const allMistakes = analyses.flatMap((a) => a.mistakes);
    const biggestMistake =
        allMistakes.length > 0
            ? allMistakes.reduce((worst, m) =>
                  m.evLoss > worst.evLoss ? m : worst,
              )
            : null;

    // Count mistakes by round
    const mistakesByRound: Record<BettingRound, number> = {
        preflop: 0,
        flop: 0,
        turn: 0,
        river: 0,
        showdown: 0,
    };

    for (const mistake of allMistakes) {
        mistakesByRound[mistake.round]++;
    }

    // Count mistakes by type and category
    const mistakesByType: Record<string, { count: number; totalEvLoss: number }> = {};
    const mistakesByCategory: Record<string, { count: number; totalEvLoss: number }> = {};

    for (const mistake of allMistakes) {
        if (mistake.type) {
            if (!mistakesByType[mistake.type]) {
                mistakesByType[mistake.type] = { count: 0, totalEvLoss: 0 };
            }
            mistakesByType[mistake.type].count++;
            mistakesByType[mistake.type].totalEvLoss += mistake.evLoss;
        }
        if (mistake.category) {
            if (!mistakesByCategory[mistake.category]) {
                mistakesByCategory[mistake.category] = { count: 0, totalEvLoss: 0 };
            }
            mistakesByCategory[mistake.category].count++;
            mistakesByCategory[mistake.category].totalEvLoss += mistake.evLoss;
        }
    }

    // Find weakest type
    const typeEntries = Object.entries(mistakesByType);
    const weakestType = typeEntries.length > 0
        ? typeEntries.reduce((worst, [type, data]) =>
            data.totalEvLoss > worst.totalEvLoss
                ? { type, ...data }
                : worst,
            { type: typeEntries[0][0], ...typeEntries[0][1] },
        )
        : null;

    return {
        totalHands,
        averageGrade,
        totalEvLoss: Math.round(totalEvLoss * 100) / 100,
        averageEvLossPerHand: Math.round(averageEvLossPerHand * 100) / 100,
        biggestMistake,
        mistakesByRound,
        mistakesByType,
        mistakesByCategory,
        weakestType,
    };
}
