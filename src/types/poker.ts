// ── Primitive Types ──────────────────────────────────────────────────

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export type Rank =
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "J"
    | "Q"
    | "K"
    | "A";

export type ActionType = "fold" | "check" | "call" | "bet" | "raise";

export type BettingRound = "preflop" | "flop" | "turn" | "river" | "showdown";

export type GamePhase = "settings" | "playing" | "showdown" | "analysis";

export type AIPersonality = "TAG" | "LAG" | "tight-passive" | "loose-passive";

export type HeroGrade =
    | "A+"
    | "A"
    | "A-"
    | "B+"
    | "B"
    | "B-"
    | "C+"
    | "C"
    | "C-"
    | "D"
    | "F";

// ── Core Interfaces ─────────────────────────────────────────────────

export interface Card {
    suit: Suit;
    rank: Rank;
}

export interface Player {
    id: string;
    name: string;
    stack: number;
    holeCards: Card[];
    isDealer: boolean;
    isFolded: boolean;
    currentBet: number;
    isHero: boolean;
    isAllIn: boolean;
    personality?: AIPersonality;
}

export interface PlayerAction {
    playerId: string;
    type: ActionType;
    amount?: number;
    round: BettingRound;
    timestamp: number;
}

export interface GameSettings {
    playerCount: number;
    smallBlind: number;
    bigBlind: number;
    startingStack: number;
}

// ── Game State ──────────────────────────────────────────────────────

export interface GameState {
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
}

// ── Hand History ────────────────────────────────────────────────────

export interface HandHistory {
    handNumber: number;
    bigBlind?: number;
    players: Player[];
    communityCards: Card[];
    actions: PlayerAction[];
    pot: number;
    winnerId: string;
    winnerHand?: string;
    potWon: number;
}

// ── Analysis ────────────────────────────────────────────────────────

export interface Decision {
    round: BettingRound;
    heroAction: ActionType;
    heroAmount?: number;
    optimalAction: ActionType;
    optimalAmount?: number;
    optimalFrequencies: {
        fold: number;
        call: number;
        raise: number;
    };
    evDiff: number;
}

export interface Mistake {
    round: BettingRound;
    description: string;
    severity: "minor" | "moderate" | "major";
    evLoss: number;
    heroAction: ActionType;
    optimalAction: ActionType;
}

export interface AnalysisData {
    heroGrade: HeroGrade;
    decisions: Decision[];
    totalEvLoss: number;
    mistakes: Mistake[];
    handNumber: number;
}

// ── Hand Evaluation ─────────────────────────────────────────────────

export enum HandRank {
    HIGH_CARD,
    PAIR,
    TWO_PAIR,
    THREE_OF_A_KIND,
    STRAIGHT,
    FLUSH,
    FULL_HOUSE,
    FOUR_OF_A_KIND,
    STRAIGHT_FLUSH,
    ROYAL_FLUSH,
}

export interface HandEvaluation {
    rank: HandRank;
    cards: Card[];
    description: string;
    /** Normalized hand strength from 0 to 1 */
    strength: number;
}
