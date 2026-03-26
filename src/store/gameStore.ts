import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
    ActionType,
    AnalysisData,
    BettingRound,
    Card,
    GamePhase,
    GameSettings,
    HandHistory,
    Player,
    PlayerAction,
    SidePot,
} from "../types/poker";
import { createDeck, shuffleDeck, dealCards } from "../lib/deck";
import { AI_NAMES, getRandomPersonality, getAIDecision } from "../lib/ai";
import { getBestHand, compareHands } from "../lib/evaluator";
import { analyzeHand } from "../lib/analysis";
import { useProgressStore } from "./progressStore";

// ── Defaults ────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: GameSettings = {
    playerCount: 2,
    smallBlind: 5,
    bigBlind: 10,
    startingStack: 1000,
};

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Finds the next player who is not folded and not all-in, wrapping around.
 * Returns -1 if no such player exists.
 */
function getNextActivePlayerIndex(
    fromIndex: number,
    players: Player[],
): number {
    const n = players.length;
    for (let i = 1; i <= n; i++) {
        const idx = (fromIndex + i) % n;
        if (!players[idx].isFolded && !players[idx].isAllIn) {
            return idx;
        }
    }
    return -1;
}

/**
 * Checks if all active (non-folded, non-all-in) players have acted this round
 * and bets are equalized.
 */
function isRoundComplete(
    players: Player[],
    actions: PlayerAction[],
    currentRound: BettingRound,
): boolean {
    const roundActions = actions.filter((a) => a.round === currentRound);
    const activePlayers = players.filter((p) => !p.isFolded && !p.isAllIn);

    if (activePlayers.length === 0) return true;

    // Every active player must have acted at least once in this round
    for (const player of activePlayers) {
        const hasActed = roundActions.some((a) => a.playerId === player.id);
        if (!hasActed) return false;
    }

    // All active players' currentBets must be equal
    const targetBet = activePlayers[0].currentBet;
    for (const player of activePlayers) {
        if (player.currentBet !== targetBet) return false;
    }

    return true;
}

/**
 * Counts non-folded players.
 */
function countActivePlayers(players: Player[]): number {
    return players.filter((p) => !p.isFolded).length;
}

/**
 * Calculates the current highest bet among all players.
 */
function getCurrentBet(players: Player[]): number {
    return Math.max(0, ...players.map((p) => p.currentBet));
}

/**
 * Calculates the minimum raise amount based on the big blind.
 *
 * Note: In full poker rules the minimum raise must match the last raise
 * increment, which requires reconstructing per-player cumulative bets
 * per round. Since `action.amount` records the pot-delta (additional chips),
 * not the total commitment, a simple max-of-amounts approach is incorrect.
 * For a practice app with AI opponents that size their own raises via pot
 * multipliers, returning the big blind is a correct-enough simplification.
 */
function getMinRaise(
    _actions: PlayerAction[],
    _currentRound: BettingRound,
    bigBlind: number,
): number {
    return bigBlind;
}

// ── Store Types ─────────────────────────────────────────────────────

export function computeSidePots(
    contributions: Record<string, number>,
    foldedIds: Set<string>,
): SidePot[] {
    const entries = Object.entries(contributions);
    const levels = [...new Set(entries.map(([, amt]) => amt))].sort((a, b) => a - b);

    const pots: SidePot[] = [];
    let prevLevel = 0;

    for (const level of levels) {
        const increment = level - prevLevel;
        if (increment <= 0) continue;

        const contributors = entries
            .filter(([, amt]) => amt >= level)
            .map(([id]) => id);

        const amount = increment * contributors.length;
        const eligiblePlayerIds = contributors.filter((id) => !foldedIds.has(id));

        if (eligiblePlayerIds.length > 0) {
            pots.push({ amount, eligiblePlayerIds });
        } else if (pots.length > 0) {
            pots[pots.length - 1].amount += amount;
        } else {
            pots.push({ amount, eligiblePlayerIds: contributors });
        }

        prevLevel = level;
    }

    return pots;
}

interface StoreState {
    // Game state
    players: Player[];
    deck: Card[];
    communityCards: Card[];
    pot: number;
    contributions: Record<string, number>;
    currentRound: BettingRound;
    actions: PlayerAction[];
    activePlayerIndex: number;
    dealerIndex: number;
    settings: GameSettings;
    handNumber: number;
    gamePhase: GamePhase;
    winner?: string;
    winnerHand?: string;
    handHistory: HandHistory[];

    // Analysis
    analysisData: AnalysisData | null;
    sessionAnalyses: AnalysisData[];
    selectedAnalysisIndex: number; // -1 = latest

    // Training mode
    trainingMode: boolean;
    isProcessingAI: boolean;
    aiActionToast: { playerName: string; action: string; amount?: number } | null;

    // Actions
    updateSettings: (settings: Partial<GameSettings>) => void;
    startHand: () => void;
    performAction: (action: ActionType, amount?: number) => void;
    processAITurns: () => Promise<void>;
    advanceRound: () => void;
    resolveShowdown: () => void;
    viewAnalysis: () => void;
    resetGame: () => void;
    setTrainingMode: (enabled: boolean) => void;
    selectAnalysis: (index: number) => void;
    getActiveAnalysis: () => AnalysisData | null;
}

// ── Store ────────────────────────────────────────────────────────────

export const useGameStore = create<StoreState>()(
    persist(
        (set, get) => ({
    // ── Initial State ──
    players: [],
    deck: [],
    communityCards: [],
    pot: 0,
    contributions: {},
    currentRound: "preflop",
    actions: [],
    activePlayerIndex: 0,
    dealerIndex: 0,
    settings: { ...DEFAULT_SETTINGS },
    handNumber: 0,
    gamePhase: "settings",
    winner: undefined,
    winnerHand: undefined,
    handHistory: [],
    analysisData: null,
    sessionAnalyses: [],
    selectedAnalysisIndex: -1,
    trainingMode: false,
    isProcessingAI: false,
    aiActionToast: null,

    // ── updateSettings ──
    updateSettings: (newSettings) => {
        const { gamePhase } = get();
        if (gamePhase !== "settings") return;

        set((state) => ({
            settings: { ...state.settings, ...newSettings },
        }));
    },

    // ── startHand ──
    startHand: () => {
        const state = get();
        const { settings, gamePhase } = state;

        if (
            gamePhase !== "settings" &&
            gamePhase !== "analysis" &&
            gamePhase !== "showdown"
        )
            return;

        const numPlayers = settings.playerCount;
        const isNewGame = gamePhase === "settings";

        // Create or reset players
        let players: Player[];
        const newDealerIndex = isNewGame
            ? 0
            : (state.dealerIndex + 1) % numPlayers;

        if (isNewGame) {
            // Create fresh players: Hero at index 0, AI for the rest
            players = [];
            players.push({
                id: "hero",
                name: "Hero",
                stack: settings.startingStack,
                holeCards: [],
                isDealer: false,
                isFolded: false,
                currentBet: 0,
                isHero: true,
                isAllIn: false,
            });

            for (let i = 1; i < numPlayers; i++) {
                players.push({
                    id: `ai-${i}`,
                    name: AI_NAMES[i - 1] ?? `AI ${i}`,
                    stack: settings.startingStack,
                    holeCards: [],
                    isDealer: false,
                    isFolded: false,
                    currentBet: 0,
                    isHero: false,
                    isAllIn: false,
                    personality: getRandomPersonality(),
                });
            }
        } else {
            // Continue from previous hand — reset per-hand state, refill busted players
            players = state.players.map((p) => ({
                ...p,
                holeCards: [],
                isDealer: false,
                isFolded: false,
                currentBet: 0,
                isAllIn: false,
                stack: p.stack <= 0 ? settings.startingStack : p.stack,
            }));
        }

        // Set dealer
        players[newDealerIndex].isDealer = true;

        // Create and shuffle deck
        const deck = shuffleDeck(createDeck());

        // Post blinds
        const sbIndex =
            numPlayers === 2
                ? newDealerIndex // heads-up: dealer posts SB
                : (newDealerIndex + 1) % numPlayers;
        const bbIndex =
            numPlayers === 2
                ? (newDealerIndex + 1) % numPlayers
                : (newDealerIndex + 2) % numPlayers;

        const sbAmount = Math.min(settings.smallBlind, players[sbIndex].stack);
        players[sbIndex].stack -= sbAmount;
        players[sbIndex].currentBet = sbAmount;
        if (players[sbIndex].stack === 0) players[sbIndex].isAllIn = true;

        const bbAmount = Math.min(settings.bigBlind, players[bbIndex].stack);
        players[bbIndex].stack -= bbAmount;
        players[bbIndex].currentBet = bbAmount;
        if (players[bbIndex].stack === 0) players[bbIndex].isAllIn = true;

        let pot = sbAmount + bbAmount;

        const contributions: Record<string, number> = {};
        contributions[players[sbIndex].id] = sbAmount;
        contributions[players[bbIndex].id] = bbAmount;

        // Deal 2 cards to each player
        let remainingDeck = deck;
        for (let i = 0; i < numPlayers; i++) {
            const result = dealCards(remainingDeck, 2);
            players[i].holeCards = result.dealt;
            remainingDeck = result.remaining;
        }

        // UTG is the player after the big blind
        const utgIndex = (bbIndex + 1) % numPlayers;
        // Find the first active player from UTG
        let activePlayerIndex = utgIndex;
        if (
            players[activePlayerIndex].isFolded ||
            players[activePlayerIndex].isAllIn
        ) {
            activePlayerIndex = getNextActivePlayerIndex(utgIndex - 1, players);
        }

        const handNumber = state.handNumber + 1;

        set({
            players,
            deck: remainingDeck,
            communityCards: [],
            pot,
            contributions,
            currentRound: "preflop",
            actions: [],
            activePlayerIndex,
            dealerIndex: newDealerIndex,
            handNumber,
            gamePhase: "playing",
            winner: undefined,
            winnerHand: undefined,
            analysisData: null,
        });
    },

    // ── performAction ──
    performAction: (action, amount) => {
        const state = get();
        const { activePlayerIndex, players, currentRound } = state;
        const player = players[activePlayerIndex];

        if (!player || player.isFolded || player.isAllIn) return;

        const updatedPlayers = [...players];
        const updatedPlayer = { ...updatedPlayers[activePlayerIndex] };
        updatedPlayers[activePlayerIndex] = updatedPlayer;

        let potDelta = 0;

        switch (action) {
            case "fold":
                updatedPlayer.isFolded = true;
                break;

            case "check":
                // No changes to stack or bet
                break;

            case "call": {
                const highestBet = getCurrentBet(players);
                const toCall = Math.min(
                    highestBet - updatedPlayer.currentBet,
                    updatedPlayer.stack,
                );
                updatedPlayer.stack -= toCall;
                updatedPlayer.currentBet += toCall;
                potDelta = toCall;
                if (updatedPlayer.stack === 0) updatedPlayer.isAllIn = true;
                break;
            }

            case "bet":
            case "raise": {
                const betAmount = amount ?? 0;
                const totalCommitment = betAmount;
                const additionalAmount = Math.max(
                    0,
                    Math.min(
                        totalCommitment - updatedPlayer.currentBet,
                        updatedPlayer.stack,
                    ),
                );
                updatedPlayer.stack -= additionalAmount;
                updatedPlayer.currentBet += additionalAmount;
                potDelta = additionalAmount;
                if (updatedPlayer.stack === 0) updatedPlayer.isAllIn = true;
                break;
            }
        }

        // Record the action
        const newAction: PlayerAction = {
            playerId: player.id,
            type: action,
            amount: potDelta > 0 ? potDelta : undefined,
            round: currentRound,
            timestamp: Date.now(),
        };

        const updatedContributions = { ...state.contributions };
        if (potDelta > 0) {
            updatedContributions[player.id] = (updatedContributions[player.id] ?? 0) + potDelta;
        }

        const updatedActions = [...state.actions, newAction];
        const newPot = state.pot + potDelta;

        // Check if only one player remains (all others folded)
        const activePlayers = countActivePlayers(updatedPlayers);
        if (activePlayers === 1) {
            // Last player standing wins
            const winner = updatedPlayers.find((p) => !p.isFolded)!;
            winner.stack += newPot;

            const handHistoryEntry: HandHistory = {
                handNumber: state.handNumber,
                bigBlind: state.settings.bigBlind,
                players: updatedPlayers.map((p) => ({ ...p })),
                communityCards: [...state.communityCards],
                actions: updatedActions,
                pot: newPot,
                winnerId: winner.id,
                potWon: newPot,
            };

            set({
                players: updatedPlayers,
                pot: 0,
                contributions: {},
                actions: updatedActions,
                gamePhase: "showdown",
                winner: winner.id,
                winnerHand: undefined,
                handHistory: [...state.handHistory, handHistoryEntry],
            });
            return;
        }

        // Check if round is complete
        if (isRoundComplete(updatedPlayers, updatedActions, currentRound)) {
            set({
                players: updatedPlayers,
                pot: newPot,
                contributions: updatedContributions,
                actions: updatedActions,
            });
            get().advanceRound();
            return;
        }

        // Advance to next active player
        const nextActiveIndex = getNextActivePlayerIndex(
            activePlayerIndex,
            updatedPlayers,
        );

        set({
            players: updatedPlayers,
            pot: newPot,
            contributions: updatedContributions,
            actions: updatedActions,
            activePlayerIndex:
                nextActiveIndex !== -1 ? nextActiveIndex : activePlayerIndex,
        });
    },

    // ── processAITurns ──
    processAITurns: async () => {
        const state = get();
        if (state.gamePhase !== "playing") return;
        if (state.isProcessingAI) return; // prevent re-entry

        set({ isProcessingAI: true });

        const delay = (ms: number) =>
            new Promise<void>((resolve) => setTimeout(resolve, ms));

        let currentState = get();
        let activeIdx = currentState.activePlayerIndex;
        let activePlayer = currentState.players[activeIdx];

        // Safety: limit iterations to prevent infinite loops
        const MAX_AI_ACTIONS = 50;
        let actionCount = 0;

        // Keep processing while the active player is AI (not hero)
        while (
            activePlayer &&
            !activePlayer.isHero &&
            !activePlayer.isFolded &&
            !activePlayer.isAllIn &&
            actionCount < MAX_AI_ACTIONS
        ) {
            actionCount++;
            const {
                players,
                communityCards,
                pot,
                currentRound,
                actions,
                settings,
            } = get();

            // If game is no longer in playing phase, stop
            if (get().gamePhase !== "playing") break;

            const currentBet = getCurrentBet(players);
            const minRaise = getMinRaise(
                actions,
                currentRound,
                settings.bigBlind,
            );
            const numActive = countActivePlayers(players);

            // Find the active player's seat index
            const aiSeatIndex = players.findIndex(
                (p) => p.id === activePlayer.id,
            );

            const decision = getAIDecision({
                player: activePlayer,
                communityCards,
                pot,
                currentBet,
                minRaise,
                round: currentRound,
                numActivePlayers: numActive,
                dealerIndex: get().dealerIndex,
                seatIndex: aiSeatIndex,
                numPlayers: players.length,
                actions: [...actions],
                bigBlind: settings.bigBlind,
            });

            // Enforce raise cap (max 4 raises per round) to prevent
            // endless re-raise wars between aggressive AI players
            const roundRaises = actions.filter(
                (a) =>
                    a.round === currentRound &&
                    (a.type === "raise" || a.type === "bet"),
            ).length;
            if (
                roundRaises >= 4 &&
                (decision.action === "raise" || decision.action === "bet")
            ) {
                const toCall = Math.max(
                    0,
                    currentBet - activePlayer.currentBet,
                );
                if (toCall > 0 && toCall <= activePlayer.stack) {
                    decision.action = "call";
                    decision.amount = toCall;
                } else if (toCall === 0) {
                    decision.action = "check";
                    decision.amount = undefined;
                } else {
                    decision.action = "fold";
                    decision.amount = undefined;
                }
            }

            // Show toast for this AI action
            const toastAction =
                decision.action === "fold"
                    ? "folds"
                    : decision.action === "check"
                      ? "checks"
                      : decision.action === "call"
                        ? "calls"
                        : decision.action === "raise"
                          ? "raises to"
                          : "bets";
            set({
                aiActionToast: {
                    playerName: activePlayer.name,
                    action: toastAction,
                    amount: decision.amount,
                },
            });

            // Wait 600ms before executing the action (visual pacing)
            await delay(600);

            // AI engine returns raise/bet amounts as additional chips (potDelta).
            // performAction expects total commitment, so convert by adding currentBet.
            let actionAmount = decision.amount;
            if (
                actionAmount !== undefined &&
                (decision.action === "bet" || decision.action === "raise")
            ) {
                actionAmount = activePlayer.currentBet + actionAmount;
            }

            get().performAction(decision.action, actionAmount);

            // Refresh state after action
            currentState = get();
            if (currentState.gamePhase !== "playing") break;

            activeIdx = currentState.activePlayerIndex;
            activePlayer = currentState.players[activeIdx];
        }

        set({ isProcessingAI: false, aiActionToast: null });
    },

    // ── advanceRound ──
    advanceRound: () => {
        const state = get();
        const { currentRound, deck, dealerIndex, players } = state;

        // Reset all players' currentBet to 0
        const updatedPlayers = players.map((p) => ({ ...p, currentBet: 0 }));

        const nextRound: Record<string, BettingRound> = {
            preflop: "flop",
            flop: "turn",
            turn: "river",
        };

        const upcoming = nextRound[currentRound];

        // If we're at river, go to showdown
        if (!upcoming || currentRound === "river") {
            set({ players: updatedPlayers });
            get().resolveShowdown();
            return;
        }

        // Deal community cards
        let newCommunityCards = [...state.communityCards];
        let remainingDeck = deck;

        if (upcoming === "flop") {
            const result = dealCards(remainingDeck, 3);
            newCommunityCards = [...newCommunityCards, ...result.dealt];
            remainingDeck = result.remaining;
        } else {
            // Turn or river: deal 1 card
            const result = dealCards(remainingDeck, 1);
            newCommunityCards = [...newCommunityCards, ...result.dealt];
            remainingDeck = result.remaining;
        }

        // First active player after dealer (postflop order)
        const numPlayers = updatedPlayers.length;
        let firstActive = -1;
        for (let i = 1; i <= numPlayers; i++) {
            const idx = (dealerIndex + i) % numPlayers;
            if (!updatedPlayers[idx].isFolded && !updatedPlayers[idx].isAllIn) {
                firstActive = idx;
                break;
            }
        }

        // If no active player found (all all-in or folded), we need to keep dealing
        if (firstActive === -1) {
            // All remaining players are all-in — run out the board
            set({
                players: updatedPlayers,
                deck: remainingDeck,
                communityCards: newCommunityCards,
                currentRound: upcoming,
            });
            // Continue advancing rounds until showdown
            get().advanceRound();
            return;
        }

        set({
            players: updatedPlayers,
            deck: remainingDeck,
            communityCards: newCommunityCards,
            currentRound: upcoming,
            activePlayerIndex: firstActive,
        });
    },

    // ── resolveShowdown ──
    resolveShowdown: () => {
        const state = get();
        const { players, communityCards, pot, handNumber, actions, contributions } = state;

        const contenders = players
            .map((p, i) => ({ player: p, index: i }))
            .filter(({ player }) => !player.isFolded);

        if (contenders.length === 0) return;

        // Edge case: not enough community cards
        if (communityCards.length < 3) {
            const winner = contenders[0];
            const updatedPlayers = players.map((p, i) => {
                if (i === winner.index) return { ...p, stack: p.stack + pot };
                return { ...p };
            });

            const handHistoryEntry: HandHistory = {
                handNumber,
                bigBlind: state.settings.bigBlind,
                players: updatedPlayers.map((p) => ({ ...p })),
                communityCards: [...communityCards],
                actions: [...actions],
                pot,
                winnerId: winner.player.id,
                winnerHand: undefined,
                potWon: pot,
            };

            set({
                players: updatedPlayers,
                pot: 0,
                contributions: {},
                gamePhase: "showdown",
                winner: winner.player.id,
                winnerHand: undefined,
                handHistory: [...state.handHistory, handHistoryEntry],
            });
            return;
        }

        // Compute side pots
        const foldedIds = new Set(
            players.filter((p) => p.isFolded).map((p) => p.id),
        );
        const sidePots = computeSidePots(contributions, foldedIds);

        // Resolve each pot independently
        const updatedPlayers = players.map((p) => ({ ...p }));
        let overallWinnerId = contenders[0].player.id;
        let overallWinnerHand: string | undefined;

        for (const sidePot of sidePots) {
            // Find eligible contenders for this pot
            const eligible = contenders.filter(({ player }) =>
                sidePot.eligiblePlayerIds.includes(player.id),
            );

            if (eligible.length === 0) continue;

            if (eligible.length === 1) {
                // Only one eligible — they win this pot
                const winnerIdx = eligible[0].index;
                updatedPlayers[winnerIdx].stack += sidePot.amount;
                continue;
            }

            // Compare hands among eligible contenders
            let bestGroup = [eligible[0]];
            let bestCards = [...eligible[0].player.holeCards, ...communityCards];

            for (let i = 1; i < eligible.length; i++) {
                const c = eligible[i];
                const cCards = [...c.player.holeCards, ...communityCards];
                const cmp = compareHands(cCards, bestCards);
                if (cmp > 0) {
                    bestGroup = [c];
                    bestCards = cCards;
                } else if (cmp === 0) {
                    bestGroup.push(c);
                }
            }

            // Split this pot among winners
            const share = Math.floor(sidePot.amount / bestGroup.length);
            const remainder = sidePot.amount - share * bestGroup.length;

            for (let i = 0; i < bestGroup.length; i++) {
                const extra = i === 0 ? remainder : 0;
                updatedPlayers[bestGroup[i].index].stack += share + extra;
            }

            // Track overall winner (winner of the main pot)
            if (sidePot === sidePots[0]) {
                overallWinnerId = bestGroup[0].player.id;
                const bestEval = getBestHand(bestGroup[0].player.holeCards, communityCards);
                overallWinnerHand = bestEval.description;
            }
        }

        // Total won by overall winner
        const overallWinnerIdx = players.findIndex((p) => p.id === overallWinnerId);
        const totalWon = updatedPlayers[overallWinnerIdx].stack - players[overallWinnerIdx].stack;

        const handHistoryEntry: HandHistory = {
            handNumber,
            bigBlind: state.settings.bigBlind,
            players: updatedPlayers.map((p) => ({ ...p })),
            communityCards: [...communityCards],
            actions: [...actions],
            pot,
            winnerId: overallWinnerId,
            winnerHand: overallWinnerHand,
            potWon: totalWon,
        };

        set({
            players: updatedPlayers,
            pot: 0,
            contributions: {},
            gamePhase: "showdown",
            winner: overallWinnerId,
            winnerHand: overallWinnerHand,
            handHistory: [...state.handHistory, handHistoryEntry],
        });
    },

    // ── viewAnalysis ──
    viewAnalysis: () => {
        const state = get();
        if (state.gamePhase !== "showdown") return;

        const latestHistory = state.handHistory[state.handHistory.length - 1];
        if (!latestHistory) return;

        const analysis = analyzeHand(latestHistory);

        set({
            gamePhase: "analysis",
            analysisData: analysis,
            sessionAnalyses: [...state.sessionAnalyses, analysis],
        });
        useProgressStore.getState().recordLiveHand(analysis);
    },

    // ── selectAnalysis ──
    selectAnalysis: (index: number) => set({ selectedAnalysisIndex: index }),

    // ── getActiveAnalysis ──
    getActiveAnalysis: () => {
        const state = get();
        if (state.selectedAnalysisIndex === -1) {
            return state.analysisData;
        }
        return state.sessionAnalyses[state.selectedAnalysisIndex] ?? state.analysisData;
    },

    // ── resetGame ──
    resetGame: () => {
        set({
            players: [],
            deck: [],
            communityCards: [],
            pot: 0,
            contributions: {},
            currentRound: "preflop",
            actions: [],
            activePlayerIndex: 0,
            dealerIndex: 0,
            settings: { ...DEFAULT_SETTINGS },
            handNumber: 0,
            gamePhase: "settings",
            winner: undefined,
            winnerHand: undefined,
            handHistory: [],
            analysisData: null,
            sessionAnalyses: [],
            selectedAnalysisIndex: -1,
            isProcessingAI: false,
            aiActionToast: null,
        });
    },

    // ── setTrainingMode ──
    setTrainingMode: (enabled) => set({ trainingMode: enabled }),
        }),
        {
            name: "ppa-settings-v1",
            version: 1,
            partialize: (state) => ({
                settings: state.settings,
                trainingMode: state.trainingMode,
            }),
        }
    )
);
