import type { Card, Position, ActionType, DecisionContext, DecisionResult } from './poker';

// ── Drill-Specific Types ────────────────────────────────────────────

export type SpotCategory = 'preflop' | 'flop' | 'turn' | 'river';

export type DrillConcept =
  | 'open_raise' | 'three_bet' | 'cold_call' | 'squeeze' | 'steal'
  | 'cbet_value' | 'cbet_bluff' | 'check_raise' | 'float' | 'probe'
  | 'barrel' | 'pot_control' | 'semi_bluff' | 'check_call'
  | 'value_bet_thin' | 'bluff_catch' | 'river_raise' | 'river_bluff';

export interface DrillSpot {
  id: string;
  name: string;
  category: SpotCategory;
  difficulty: 1 | 2 | 3;
  description: string;
  concept: DrillConcept;
  tags: string[];

  // Visual display state
  heroCards: [Card, Card];
  communityCards: Card[];
  potSize: number;
  heroStack: number;
  villainStack: number;
  heroPosition: Position;
  villainPosition: Position;
  previousActions: string;

  // Engine input — passed to evaluateDecision()
  decisionContext: DecisionContext;
}

export interface DrillFilters {
  categories: SpotCategory[];
  difficulties: (1 | 2 | 3)[];
  concepts: DrillConcept[];
}

export interface DrillResult {
  spotId: string;
  heroAction: ActionType;
  heroRaiseSize?: number;
  isCorrect: boolean;
  evDelta: number;
  optimalResult: DecisionResult;
  timestamp: number;
}

export interface DrillSession {
  allSpots: DrillSpot[];
  queue: DrillSpot[];
  currentIndex: number;
  results: DrillResult[];
  filters: DrillFilters;
  streak: number;
  bestStreak: number;
}
