import type {
    Card,
    Player,
    PlayerAction,
    ActionType,
    BettingRound,
    AIPersonality,
    Position,
    DecisionContext,
    DecisionResult,
} from "../types/poker";
import { evaluateDecision } from "./poker-engine/decision";
import { getPosition } from "./poker-engine/position";
import { cardValue } from "./deck";

// ── Public Types ────────────────────────────────────────────────────

export interface AIDecisionParams {
    player: Player;
    communityCards: Card[];
    pot: number;
    currentBet: number;
    minRaise: number;
    round: BettingRound;
    numActivePlayers: number;
    // New fields for poker engine (added in Task 9)
    dealerIndex?: number;
    seatIndex?: number;
    numPlayers?: number;
    actions?: PlayerAction[];
    bigBlind?: number;
}

export interface AIDecisionResult {
    action: ActionType;
    amount?: number;
}

export interface PersonalityProfile {
    preflopRange: number;
    aggressionFactor: number;
    bluffFrequency: number;
}

// ── Constants ───────────────────────────────────────────────────────

export const AI_NAMES: string[] = [
    "Shark",
    "Ace",
    "Bluffer",
    "Rock",
    "Maverick",
    "Dealer",
    "Ghost",
    "Fox",
];

/**
 * Personality deviation parameters.
 *
 * | Personality    | Range adj | Aggression      | Bluff freq | Passivity |
 * |----------------|-----------|-----------------|------------|-----------|
 * | TAG            | 95%       | Slightly above  | Low  (5%)  | Low  (5%)|
 * | LAG            | 130%      | High            | High (20%) | Low  (3%)|
 * | tight-passive  | 80%       | Very low        | Min  (3%)  | High(40%)|
 * | loose-passive  | 150%      | Low             | Low  (8%)  | High(50%)|
 *
 * - looseness: probability of continuing when the engine says fold
 * - aggression: probability of raising when the engine says call
 * - bluffFreq: probability of betting/raising when the engine says check
 * - passivity: probability of calling when the engine says raise
 */
interface PersonalityDeviation {
    looseness: number;
    aggression: number;
    bluffFreq: number;
    passivity: number;
}

const PERSONALITY_PROFILES: Record<AIPersonality, PersonalityProfile> = {
    TAG: { preflopRange: 0.2, aggressionFactor: 0.7, bluffFrequency: 0.05 },
    LAG: { preflopRange: 0.4, aggressionFactor: 0.8, bluffFrequency: 0.2 },
    "tight-passive": {
        preflopRange: 0.15,
        aggressionFactor: 0.2,
        bluffFrequency: 0.03,
    },
    "loose-passive": {
        preflopRange: 0.5,
        aggressionFactor: 0.3,
        bluffFrequency: 0.08,
    },
};

const PERSONALITY_DEVIATIONS: Record<AIPersonality, PersonalityDeviation> = {
    TAG: { looseness: 0.05, aggression: 0.15, bluffFreq: 0.05, passivity: 0.05 },
    LAG: { looseness: 0.30, aggression: 0.35, bluffFreq: 0.20, passivity: 0.03 },
    "tight-passive": {
        looseness: 0.0,
        aggression: 0.03,
        bluffFreq: 0.03,
        passivity: 0.40,
    },
    "loose-passive": {
        looseness: 0.50,
        aggression: 0.05,
        bluffFreq: 0.08,
        passivity: 0.50,
    },
};

// ── Personality ─────────────────────────────────────────────────────

/** Returns personality-specific thresholds and tendencies. */
export function getPersonalityAdjustment(
    personality: AIPersonality,
): PersonalityProfile {
    return PERSONALITY_PROFILES[personality];
}

/** Returns a random AI personality. */
export function getRandomPersonality(): AIPersonality {
    const personalities: AIPersonality[] = [
        "TAG",
        "LAG",
        "tight-passive",
        "loose-passive",
    ];
    return personalities[Math.floor(Math.random() * personalities.length)];
}

// ── Preflop Hand Strength ───────────────────────────────────────────

/**
 * Estimates preflop hand strength on a 0–1 scale.
 *
 * Uses a simplified model: pairs are valued by rank, suited/connected
 * bonuses are applied, and high-card kickers contribute.
 *
 * Representative values:
 *   AA ≈ 1.0, KK ≈ 0.95, QQ ≈ 0.90
 *   AKs ≈ 0.85, AKo ≈ 0.80, 72o ≈ 0.05
 */
export function getPreflopHandStrength(holeCards: Card[]): number {
    if (holeCards.length !== 2) return 0;

    const [c1, c2] = holeCards;
    const v1 = cardValue(c1);
    const v2 = cardValue(c2);
    const high = Math.max(v1, v2);
    const low = Math.min(v1, v2);
    const suited = c1.suit === c2.suit;
    const gap = high - low;
    const isPair = v1 === v2;

    if (isPair) {
        // Pairs: scale from ~0.40 (22) to 1.0 (AA)
        return 0.4 + (high - 2) * (0.6 / 12);
    }

    // Base: average of high-card contributions
    let strength = ((high - 2) / 12) * 0.55 + ((low - 2) / 12) * 0.25;

    // Suited bonus
    if (suited) {
        strength += 0.06;
    }

    // Connectedness bonus (smaller gap = better draw potential)
    if (gap === 1) {
        strength += 0.05; // connectors
    } else if (gap === 2) {
        strength += 0.03; // one-gappers
    } else if (gap === 3) {
        strength += 0.01;
    }

    // Ace kicker bonus (when not a pair)
    if (high === 14) {
        strength += 0.05;
    }

    return Math.min(1, Math.max(0, strength));
}

// ── Context Builder ─────────────────────────────────────────────────

/**
 * Converts AIDecisionParams into a DecisionContext for the poker engine.
 *
 * When dealerIndex/seatIndex/numPlayers are provided, computes the true
 * position. Otherwise falls back to 'CO' as a reasonable default.
 */
function buildContext(params: AIDecisionParams): DecisionContext {
    const {
        player,
        communityCards,
        pot,
        currentBet,
        round,
        numActivePlayers,
        dealerIndex,
        seatIndex,
        numPlayers,
        actions,
        bigBlind,
    } = params;

    // Compute position from seat indices if available, otherwise default to CO
    let position: Position = "CO";
    if (
        dealerIndex !== undefined &&
        seatIndex !== undefined &&
        numPlayers !== undefined &&
        numPlayers >= 2
    ) {
        position = getPosition(seatIndex, dealerIndex, numPlayers);
    }

    const toCall = Math.max(0, currentBet - player.currentBet);
    const effectiveBB = bigBlind ?? 20; // sensible default
    const actionHistory = actions ?? [];

    // Determine if we're facing a raise by looking at action history.
    // When no action history is available (backward compat), infer from toCall.
    const currentRoundActions = actionHistory.filter((a) => a.round === round);
    const raises = currentRoundActions.filter(
        (a) => a.type === "raise" || a.type === "bet",
    );
    const facingRaise =
        actionHistory.length > 0
            ? raises.length > 0 && toCall > 0
            : toCall > 0; // fallback: if there's something to call, assume facing bet

    // We don't have the raiser's seat index in PlayerAction,
    // so we can't compute their position. Leave undefined.
    const raiserPosition: Position | undefined = undefined;

    // Determine if first to act this round.
    // When no action history, assume not first to act (conservative default).
    const isFirstToAct =
        actionHistory.length > 0 ? currentRoundActions.length === 0 : false;

    return {
        holeCards: player.holeCards,
        communityCards,
        position,
        round,
        pot,
        toCall,
        currentBet,
        stack: player.stack,
        bigBlind: effectiveBB,
        numActivePlayers,
        numPlayersInHand: numActivePlayers,
        isFirstToAct,
        facingRaise,
        raiserPosition,
        actionHistory,
    };
}

// ── Personality Deviations ──────────────────────────────────────────

/**
 * Applies personality-based deviations to the optimal decision.
 *
 * The engine gives us the "GTO-ish" optimal play; personality deviations
 * make each AI archetype feel distinct:
 * - Loose players continue with hands the engine says to fold
 * - Aggressive players raise when the engine says call
 * - Bluffers bet when the engine says check
 * - Passive players call when the engine says raise
 */
function applyPersonalityDeviations(
    optimal: DecisionResult,
    personality: AIPersonality,
    params: AIDecisionParams,
): AIDecisionResult {
    const dev = PERSONALITY_DEVIATIONS[personality];
    const { player, minRaise, pot, currentBet } = params;
    const toCall = Math.max(0, currentBet - player.currentBet);

    let action = optimal.optimalAction;
    let amount = optimal.optimalAmount;

    // ── Deviation 1: Looseness (fold → call) ────────────────────────
    // Looser players sometimes continue with hands the engine says to fold
    if (action === "fold" && Math.random() < dev.looseness) {
        if (toCall > 0 && toCall <= player.stack) {
            action = "call";
            amount = toCall;
        }
    }

    // ── Deviation 2: Aggression (call → raise) ──────────────────────
    // More aggressive players sometimes raise when engine says call
    if (action === "call" && Math.random() < dev.aggression) {
        const raiseAmount = Math.min(
            Math.max(minRaise, toCall * 2 + Math.round(pot * 0.5)),
            player.stack,
        );
        if (raiseAmount > toCall && raiseAmount <= player.stack) {
            action = "raise";
            amount = raiseAmount;
        }
    }

    // ── Deviation 3: Bluffing (check → bet) ─────────────────────────
    // Some players bluff more when checked to
    if (action === "check" && Math.random() < dev.bluffFreq) {
        const bluffSize = Math.round(pot * (0.5 + Math.random() * 0.25));
        const betAmount = Math.min(Math.max(minRaise, bluffSize), player.stack);
        if (betAmount >= minRaise && betAmount <= player.stack) {
            action = "bet";
            amount = betAmount;
        }
    }

    // ── Deviation 4: Passivity (raise → call) ───────────────────────
    // Passive players sometimes call when engine says raise
    if (action === "raise" && Math.random() < dev.passivity) {
        if (toCall > 0 && toCall <= player.stack) {
            action = "call";
            amount = toCall;
        } else if (toCall === 0) {
            action = "check";
            amount = undefined;
        }
    }

    // ── Bet sizing noise (±15%) ─────────────────────────────────────
    // Add personality-based noise to sizing to avoid being predictable
    if (amount !== undefined && (action === "bet" || action === "raise")) {
        const noise = 1 + (Math.random() - 0.5) * 0.3; // 0.85–1.15
        amount = Math.round(amount * noise);
        // Clamp: at least minRaise, at most stack
        amount = Math.max(minRaise, amount);
        amount = Math.min(player.stack, amount);
        // For raises, must exceed toCall
        if (action === "raise" && amount <= toCall) {
            amount = Math.min(toCall + minRaise, player.stack);
        }
    }

    // Ensure call amount is exactly toCall
    if (action === "call") {
        amount = Math.min(toCall, player.stack);
    }

    // Clean up: no amount for check/fold
    if (action === "check" || action === "fold") {
        amount = undefined;
    }

    return { action, amount };
}

// ── AI Decision Entry Point ─────────────────────────────────────────

/**
 * Determines the AI player's action given the current game state.
 *
 * Uses the poker decision engine for optimal play, then applies
 * personality-based deviations to create distinct AI archetypes.
 */
export function getAIDecision(params: AIDecisionParams): AIDecisionResult {
    const personality = params.player.personality ?? "TAG";

    const ctx = buildContext(params);
    const optimal = evaluateDecision(ctx);

    return applyPersonalityDeviations(optimal, personality, params);
}
