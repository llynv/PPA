import { create } from 'zustand';
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
} from '../types/poker';
import { createDeck, shuffleDeck, dealCards } from '../lib/deck';
import { AI_NAMES, getRandomPersonality, getAIDecision } from '../lib/ai';
import { getBestHand, compareHands } from '../lib/evaluator';
import { analyzeHand } from '../lib/analysis';

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
function getNextActivePlayerIndex(fromIndex: number, players: Player[]): number {
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
function getMinRaise(_actions: PlayerAction[], _currentRound: BettingRound, bigBlind: number): number {
  return bigBlind;
}

// ── Store Types ─────────────────────────────────────────────────────

interface StoreState {
  // Game state
  players: Player[];
  deck: Card[];
  communityCards: Card[];
  pot: number;
  currentRound: BettingRound;
  actions: PlayerAction[];
  activePlayerIndex: number;
  dealerIndex: number;
  settings: GameSettings;
  handNumber: number;
  gamePhase: GamePhase;
  winner?: string;
  handHistory: HandHistory[];

  // Analysis
  analysisData: AnalysisData | null;
  sessionAnalyses: AnalysisData[];

  // Actions
  updateSettings: (settings: Partial<GameSettings>) => void;
  startHand: () => void;
  performAction: (action: ActionType, amount?: number) => void;
  processAITurns: () => void;
  advanceRound: () => void;
  resolveShowdown: () => void;
  viewAnalysis: () => void;
  resetGame: () => void;
}

// ── Store ────────────────────────────────────────────────────────────

export const useGameStore = create<StoreState>((set, get) => ({
  // ── Initial State ──
  players: [],
  deck: [],
  communityCards: [],
  pot: 0,
  currentRound: 'preflop',
  actions: [],
  activePlayerIndex: 0,
  dealerIndex: 0,
  settings: { ...DEFAULT_SETTINGS },
  handNumber: 0,
  gamePhase: 'settings',
  winner: undefined,
  handHistory: [],
  analysisData: null,
  sessionAnalyses: [],

  // ── updateSettings ──
  updateSettings: (newSettings) => {
    const { gamePhase } = get();
    if (gamePhase !== 'settings') return;

    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

  // ── startHand ──
  startHand: () => {
    const state = get();
    const { settings, gamePhase } = state;

    if (gamePhase !== 'settings' && gamePhase !== 'analysis' && gamePhase !== 'showdown') return;

    const numPlayers = settings.playerCount;
    const isNewGame = gamePhase === 'settings';

    // Create or reset players
    let players: Player[];
    const newDealerIndex = isNewGame ? 0 : (state.dealerIndex + 1) % numPlayers;

    if (isNewGame) {
      // Create fresh players: Hero at index 0, AI for the rest
      players = [];
      players.push({
        id: 'hero',
        name: 'Hero',
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
    const sbIndex = numPlayers === 2
      ? newDealerIndex // heads-up: dealer posts SB
      : (newDealerIndex + 1) % numPlayers;
    const bbIndex = numPlayers === 2
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
    if (players[activePlayerIndex].isFolded || players[activePlayerIndex].isAllIn) {
      activePlayerIndex = getNextActivePlayerIndex(utgIndex - 1, players);
    }

    const handNumber = state.handNumber + 1;

    set({
      players,
      deck: remainingDeck,
      communityCards: [],
      pot,
      currentRound: 'preflop',
      actions: [],
      activePlayerIndex,
      dealerIndex: newDealerIndex,
      handNumber,
      gamePhase: 'playing',
      winner: undefined,
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
      case 'fold':
        updatedPlayer.isFolded = true;
        break;

      case 'check':
        // No changes to stack or bet
        break;

      case 'call': {
        const highestBet = getCurrentBet(players);
        const toCall = Math.min(highestBet - updatedPlayer.currentBet, updatedPlayer.stack);
        updatedPlayer.stack -= toCall;
        updatedPlayer.currentBet += toCall;
        potDelta = toCall;
        if (updatedPlayer.stack === 0) updatedPlayer.isAllIn = true;
        break;
      }

      case 'bet':
      case 'raise': {
        const betAmount = amount ?? 0;
        const totalCommitment = betAmount;
        const additionalAmount = Math.min(totalCommitment - updatedPlayer.currentBet, updatedPlayer.stack);
        updatedPlayer.stack -= additionalAmount;
        updatedPlayer.currentBet = totalCommitment;
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
        actions: updatedActions,
        gamePhase: 'showdown',
        winner: winner.id,
        handHistory: [...state.handHistory, handHistoryEntry],
      });
      return;
    }

    // Check if round is complete
    if (isRoundComplete(updatedPlayers, updatedActions, currentRound)) {
      set({
        players: updatedPlayers,
        pot: newPot,
        actions: updatedActions,
      });
      get().advanceRound();
      return;
    }

    // Advance to next active player
    const nextActiveIndex = getNextActivePlayerIndex(activePlayerIndex, updatedPlayers);

    set({
      players: updatedPlayers,
      pot: newPot,
      actions: updatedActions,
      activePlayerIndex: nextActiveIndex !== -1 ? nextActiveIndex : activePlayerIndex,
    });
  },

  // ── processAITurns ──
  processAITurns: () => {
    const state = get();
    if (state.gamePhase !== 'playing') return;

    let currentState = get();
    let activeIdx = currentState.activePlayerIndex;
    let activePlayer = currentState.players[activeIdx];

    // Keep processing while the active player is AI (not hero)
    while (activePlayer && !activePlayer.isHero && !activePlayer.isFolded && !activePlayer.isAllIn) {
      const { players, communityCards, pot, currentRound, actions, settings } = get();

      // If game is no longer in playing phase, stop
      if (get().gamePhase !== 'playing') break;

      const currentBet = getCurrentBet(players);
      const minRaise = getMinRaise(actions, currentRound, settings.bigBlind);
      const numActive = countActivePlayers(players);

      const decision = getAIDecision({
        player: activePlayer,
        communityCards,
        pot,
        currentBet,
        minRaise,
        round: currentRound,
        numActivePlayers: numActive,
      });

      get().performAction(decision.action, decision.amount);

      // Refresh state after action
      currentState = get();
      if (currentState.gamePhase !== 'playing') break;

      activeIdx = currentState.activePlayerIndex;
      activePlayer = currentState.players[activeIdx];
    }
  },

  // ── advanceRound ──
  advanceRound: () => {
    const state = get();
    const { currentRound, deck, dealerIndex, players } = state;

    // Reset all players' currentBet to 0
    const updatedPlayers = players.map((p) => ({ ...p, currentBet: 0 }));

    const nextRound: Record<string, BettingRound> = {
      preflop: 'flop',
      flop: 'turn',
      turn: 'river',
    };

    const upcoming = nextRound[currentRound];

    // If we're at river, go to showdown
    if (!upcoming || currentRound === 'river') {
      set({ players: updatedPlayers });
      get().resolveShowdown();
      return;
    }

    // Deal community cards
    let newCommunityCards = [...state.communityCards];
    let remainingDeck = deck;

    if (upcoming === 'flop') {
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
    const { players, communityCards, pot, handNumber, actions } = state;

    const contenders = players
      .map((p, i) => ({ player: p, index: i }))
      .filter(({ player }) => !player.isFolded);

    if (contenders.length === 0) return;

    if (communityCards.length < 3) {
      // Not enough community cards — first contender wins (shouldn't normally happen)
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
        gamePhase: 'showdown',
        winner: winner.player.id,
        handHistory: [...state.handHistory, handHistoryEntry],
      });
      return;
    }

    // Find the best hand using compareHands for precise tiebreaker logic
    let bestContenders = [contenders[0]];
    let bestCards = [...contenders[0].player.holeCards, ...communityCards];

    for (let i = 1; i < contenders.length; i++) {
      const contender = contenders[i];
      const contenderCards = [...contender.player.holeCards, ...communityCards];
      const comparison = compareHands(contenderCards, bestCards);

      if (comparison > 0) {
        // This hand is better
        bestContenders = [contender];
        bestCards = contenderCards;
      } else if (comparison === 0) {
        // Tie — add to winners
        bestContenders.push(contender);
      }
    }

    // Split pot among winners
    const share = Math.floor(pot / bestContenders.length);
    const remainder = pot - share * bestContenders.length;
    const winnerIndices = new Set(bestContenders.map((c) => c.index));

    const updatedPlayers = players.map((p, i) => {
      if (winnerIndices.has(i)) {
        // First winner gets any remainder (1 chip rounding)
        const extra = i === bestContenders[0].index ? remainder : 0;
        return { ...p, stack: p.stack + share + extra };
      }
      return { ...p };
    });

    const bestEval = getBestHand(
      bestContenders[0].player.holeCards,
      communityCards,
    );

    const handHistoryEntry: HandHistory = {
      handNumber,
      bigBlind: state.settings.bigBlind,
      players: updatedPlayers.map((p) => ({ ...p })),
      communityCards: [...communityCards],
      actions: [...actions],
      pot,
      winnerId: bestContenders[0].player.id,
      winnerHand: bestEval.description,
      potWon: pot,
    };

    set({
      players: updatedPlayers,
      pot: 0,
      gamePhase: 'showdown',
      winner: bestContenders[0].player.id,
      handHistory: [...state.handHistory, handHistoryEntry],
    });
  },

  // ── viewAnalysis ──
  viewAnalysis: () => {
    const state = get();
    if (state.gamePhase !== 'showdown') return;

    const latestHistory = state.handHistory[state.handHistory.length - 1];
    if (!latestHistory) return;

    const analysis = analyzeHand(latestHistory);

    set({
      gamePhase: 'analysis',
      analysisData: analysis,
      sessionAnalyses: [...state.sessionAnalyses, analysis],
    });
  },

  // ── resetGame ──
  resetGame: () => {
    set({
      players: [],
      deck: [],
      communityCards: [],
      pot: 0,
      currentRound: 'preflop',
      actions: [],
      activePlayerIndex: 0,
      dealerIndex: 0,
      settings: { ...DEFAULT_SETTINGS },
      handNumber: 0,
      gamePhase: 'settings',
      winner: undefined,
      handHistory: [],
      analysisData: null,
      sessionAnalyses: [],
    });
  },
}));
