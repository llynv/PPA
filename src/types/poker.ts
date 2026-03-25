import type { ConceptMastery } from "./progress";
import type { DrillConcept } from "./drill";

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

// ── Mistake Classification ──────────────────────────────────────────

export type MistakeType =
    | "OVERFOLD"
    | "OVERCALL"
    | "MISSED_VALUE_BET"
    | "MISSED_CBET"
    | "BAD_SIZING_OVER"
    | "BAD_SIZING_UNDER"
    | "CALLING_WITHOUT_ODDS"
    | "BLUFF_WRONG_SPOT"
    | "MISSED_DRAW_PLAY"
    | "PASSIVE_WITH_EQUITY";

export type MistakeCategory = "FREQUENCY" | "SIZING" | "AGGRESSION" | "EQUITY_REALIZATION";

export interface CoachingExplanation {
    whatHappened: string;
    whyMistake: string;
    whatToDo: string;
    concept: MistakeType;
}

export type CoachingDepth = "foundational" | "tactical" | "nuanced";

export interface EnhancedCoaching {
    whatHappened: string;
    whyMistake: string | null;
    whatToDo: string;
    tip: string | null;
    boardNarrative: string;
    concept: MistakeType | null;
}

export interface CoachingContext {
    decision: Decision;
    mistakeType: MistakeType | null;
    mastery: ConceptMastery | undefined;
    boardTexture: BoardTexture;
    draws: DrawInfo;
    round: BettingRound;
}

export interface Recommendation {
    concept: DrillConcept | null;
    reason: RecommendationReason;
    narrative: string;
}

export type RecommendationReason =
    | "unseen"
    | "struggling"
    | "reinforce"
    | "advance"
    | "stale"
    | "complete";

export interface SessionDebrief {
    headline: string;
    details: string[];
    suggestedDrill: DrillConcept | null;
}

export interface ConceptTeaching {
    summary: string;
    explanation: string;
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
    // New fields (optional for backward compat during migration)
    equity?: number;
    potOdds?: number;
    spr?: number;
    draws?: DrawInfo;
    boardTexture?: BoardTexture;
    reasoning?: string;
    evByAction?: { fold: number; call: number; raise: number };
    betSizeAnalysis?: {
        heroSize: number;
        optimalSize: number;
        sizingError: number;
    };
    hintUsed?: boolean;
    heroIsAllIn?: boolean;
    heroEv?: number;
    coaching?: CoachingExplanation | null;
}

export interface Mistake {
    round: BettingRound;
    description: string;
    severity: "minor" | "moderate" | "major";
    evLoss: number;
    heroAction: ActionType;
    optimalAction: ActionType;
    type?: MistakeType;
    category?: MistakeCategory;
}

export interface AnalysisData {
    heroGrade: HeroGrade;
    decisions: Decision[];
    totalEvLoss: number;
    totalHeroEv: number;
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

// ── Position Types ──────────────────────────────────────────────────

export type Position = 'UTG' | 'UTG1' | 'MP' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

// ── Draw Detection ──────────────────────────────────────────────────

export interface DrawInfo {
    flushDraw: boolean;
    flushDrawOuts: number;
    oesD: boolean;
    gutshot: boolean;
    straightDrawOuts: number;
    backdoorFlush: boolean;
    backdoorStraight: boolean;
    totalOuts: number;
    drawEquity: number;
}

// ── Board Texture ───────────────────────────────────────────────────

export interface BoardTexture {
    wetness: 'dry' | 'semi-wet' | 'wet' | 'very-wet';
    isMonotone: boolean;
    isTwoTone: boolean;
    isRainbow: boolean;
    isPaired: boolean;
    isTrips: boolean;
    highCardCount: number;
    connectedness: number;
    possibleStraights: number;
    possibleFlushes: boolean;
}

// ── Decision Context & Result ───────────────────────────────────────

export interface DecisionContext {
    holeCards: Card[];
    communityCards: Card[];
    position: Position;
    round: BettingRound;
    pot: number;
    toCall: number;
    currentBet: number;
    stack: number;
    bigBlind: number;
    numActivePlayers: number;
    numPlayersInHand: number;
    isFirstToAct: boolean;
    facingRaise: boolean;
    raiserPosition?: Position;
    actionHistory: PlayerAction[];
}

export interface DecisionResult {
    optimalAction: ActionType;
    optimalAmount?: number;
    frequencies: { fold: number; call: number; raise: number };
    reasoning: string;
    equity: number;
    potOdds: number;
    impliedOdds: number;
    spr: number;
    draws: DrawInfo;
    boardTexture: BoardTexture;
    evByAction: {
        fold: number;
        call: number;
        raise: number;
    };
}

// ── Preflop Ranges ──────────────────────────────────────────────────

export type HandCombo = string; // "AKs", "TT", "72o"

export interface PositionRanges {
    openRaise: Set<HandCombo>;
    threeBet: Set<HandCombo>;
    callOpen: Set<HandCombo>;
    call3Bet: Set<HandCombo>;
    fourBet: Set<HandCombo>;
}

// ── Equity ──────────────────────────────────────────────────────────

export interface EquityResult {
    equity: number;
    samples: number;
    wins: number;
    ties: number;
    losses: number;
}
