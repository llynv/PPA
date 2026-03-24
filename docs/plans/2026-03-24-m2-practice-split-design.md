# M2: Practice Split — Design Document

**Date:** 2026-03-24
**Status:** Approved
**Depends on:** M1 (Product Shell) — COMPLETE

## Overview

Split the `/practice` route into two distinct training modes:

1. **Live Table** (`/practice/live`) — Full hand play against AI (today's flow, relocated)
2. **Spot Drills** (`/practice/drills`) — Isolated decision practice with instant GTO feedback

A mode selector at `/practice` lets the user choose which mode to enter.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Spot source | 30-50 hardcoded curated spots | Quality over variety for M2; generator deferred to M5+ |
| Drill feedback | Full mini-dashboard | Frequency chart, EV comparison, concept explanation, mistake tag |
| Practice landing | Mode selector page | Two cards: Live Table and Spot Drills with CTAs |
| Drill state | Separate `drillStore.ts` | Independent from game store; no cross-store coupling |
| Persistence | Session-only (in-memory) | Local persistence deferred to M7 |
| Spot evaluation | Reuse `evaluateDecision()` | Spots provide `DecisionContext`; engine computes the solution at runtime |

## Route Structure

```
/practice              → PracticePage (mode selector)
/practice/live         → LiveTablePage (settings → playing → showdown)
/practice/drills       → DrillsPage (drill engine with feedback)
```

## Data Model

### DrillSpot

Each spot is a frozen pre-decision game state. Instead of hardcoding EV values, each spot provides a `DecisionContext` that the existing `evaluateDecision()` engine processes at runtime. This ensures consistency with the analysis engine.

```typescript
interface DrillSpot {
  id: string;
  name: string;                    // "BTN vs BB SRP — Flop Cbet"
  category: SpotCategory;          // 'preflop' | 'flop' | 'turn' | 'river'
  difficulty: 1 | 2 | 3;          // beginner / intermediate / advanced
  description: string;             // One-liner context for the player
  concept: DrillConcept;           // The GTO concept being tested
  tags: string[];                  // ["bluff", "position", "dry_board"]

  // Visual display state
  heroCards: [Card, Card];
  communityCards: Card[];
  potSize: number;
  heroStack: number;
  villainStack: number;
  heroPosition: Position;
  villainPosition: Position;
  previousActions: string;         // "CO opens 2.5x, Hero on BTN"

  // Engine input — passed to evaluateDecision()
  decisionContext: DecisionContext;
}

type SpotCategory = 'preflop' | 'flop' | 'turn' | 'river';

type DrillConcept =
  | 'open_raise' | 'three_bet' | 'cold_call' | 'squeeze' | 'steal'
  | 'cbet_value' | 'cbet_bluff' | 'check_raise' | 'float' | 'probe'
  | 'barrel' | 'pot_control' | 'semi_bluff' | 'check_call'
  | 'value_bet_thin' | 'bluff_catch' | 'river_raise' | 'river_bluff';
```

### DrillSession & DrillResult

```typescript
interface DrillSession {
  allSpots: DrillSpot[];           // Full library
  queue: DrillSpot[];              // Filtered/shuffled queue
  currentIndex: number;
  results: DrillResult[];
  filters: DrillFilters;
  streak: number;
  bestStreak: number;
}

interface DrillFilters {
  categories: SpotCategory[];      // Empty = all
  difficulties: (1 | 2 | 3)[];    // Empty = all
  concepts: DrillConcept[];        // Empty = all
}

interface DrillResult {
  spotId: string;
  heroAction: ActionType;
  heroRaiseSize?: number;
  isCorrect: boolean;
  evDelta: number;                 // Hero EV - Optimal EV
  optimalResult: DecisionResult;   // Full engine output for feedback
  timestamp: number;
}
```

## Drill Engine Flow

```
[/practice/drills] → Show filters (category, difficulty) + "Start Drilling" CTA
     ↓
[Load Queue] → Filter spots by criteria, shuffle, set currentIndex=0
     ↓
[Show Spot] → Display board, hero cards, pot, stacks, action context
     ↓
[Hero Decides] → Fold / Check / Call / Bet / Raise (with slider for sizing)
     ↓
[Evaluate] → Run evaluateDecision(spot.decisionContext) → get DecisionResult
     ↓
[Show Feedback] → DrillFeedback mini-dashboard (see below)
     ↓
[Next Spot] → currentIndex++, loop. Show session summary when queue exhausted.
```

## Drill Feedback Mini-Dashboard

A condensed analysis view after each decision:

1. **Verdict banner** — Green "Correct" / Yellow "Acceptable" / Red "Mistake"
   - Correct: hero chose the optimal action
   - Acceptable: hero chose a valid mixed-strategy action (frequency > 15%)
   - Mistake: hero chose an action with very low frequency
2. **Frequency bar chart** — Horizontal 3-bar showing fold/call/raise GTO frequencies, hero's choice highlighted (reuse ACTION_COLORS from DecisionChart)
3. **EV comparison** — `Your EV: +2.3 BB` vs `Optimal EV: +3.1 BB` with delta
4. **Concept card** — Concept name + engine reasoning string
5. **Context badges** — Board texture, draws, equity, pot odds, SPR (reuse badge pattern from MistakeCard)
6. **"Next Spot" CTA** — Primary button

## Spot Library Structure

30-50 spots organized by category and difficulty:

| Category | Count | Concepts |
|----------|-------|----------|
| Preflop  | 10-12 | open_raise, three_bet, cold_call, squeeze, steal |
| Flop     | 12-15 | cbet_value, cbet_bluff, check_raise, float, probe |
| Turn     | 8-10  | barrel, pot_control, semi_bluff, check_call |
| River    | 6-8   | value_bet_thin, bluff_catch, river_raise, river_bluff |

Spots are defined in `src/data/drillSpots.ts` as a plain array.

## Component Tree

```
DrillsPage
├── DrillSetup (filters + start CTA) — shown before drilling
├── DrillSpotView (during drilling)
│   ├── SpotBoard (cards, pot, stacks, positions, action context)
│   ├── DrillActionControls (fold/check/call/bet/raise + slider)
│   └── DrillFeedback (verdict, frequencies, EV, concept, badges)
└── DrillSummary (after queue exhausted)
```

## Store Design

New `src/store/drillStore.ts` using Zustand:

```typescript
interface DrillStore {
  // State
  session: DrillSession | null;
  phase: 'setup' | 'drilling' | 'feedback' | 'summary';
  currentResult: DrillResult | null;

  // Actions
  startSession: (filters: DrillFilters) => void;
  submitAnswer: (action: ActionType, raiseSize?: number) => void;
  nextSpot: () => void;
  resetSession: () => void;
}
```

No cross-store dependencies. Drill store imports from `poker-engine` directly.
