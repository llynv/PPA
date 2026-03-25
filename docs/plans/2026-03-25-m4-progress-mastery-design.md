# M4: Progress & Mastery — Design

## Problem

All progress data is ephemeral. Session stats vanish on page refresh. There is no concept of mastery, no trends over time, and the Progress page is a placeholder. Users cannot answer "Am I getting better?" or "What should I work on next?"

## Constraints

- M7 owns persistence (localStorage / optional backend). M4 builds the data model, tracking engine, and UI assuming in-memory-only, but designed so M7 can plug in a persistence layer underneath.
- The `gameStore` is already ~810 lines. Progress state goes in a **new** `progressStore` to keep concerns separated.
- Game/drill stores push data into progress (one-way), never the reverse.

## Architecture

### New Store: `progressStore`

A dedicated Zustand store that aggregates progress data from both live hands and drill sessions. Both `gameStore.viewAnalysis()` and `drillStore.submitAnswer()` call `progressStore.recordXxx()` as side effects.

```
gameStore.viewAnalysis()  ──►  progressStore.recordLiveHand(analysis)
drillStore.submitAnswer() ──►  progressStore.recordDrillAttempt(result, spot)
drillStore (summary)      ──►  progressStore.recordDrillSession(session)
```

## Data Model

### Mastery Levels

```typescript
type MasteryLevel = "unseen" | "learning" | "practiced" | "solid" | "mastered";
```

Deterministic from `ConceptMastery` fields:
- `unseen`: totalAttempts === 0
- `learning`: totalAttempts < 5, OR accuracy < 0.4
- `practiced`: totalAttempts >= 5, accuracy >= 0.4, recentAccuracy < 0.6
- `solid`: recentAccuracy >= 0.6, totalAttempts >= 10
- `mastered`: recentAccuracy >= 0.8, totalAttempts >= 15, streak >= 3

### Types

```typescript
interface AttemptRecord {
  id: string;                    // uuid
  source: "live" | "drill";
  concept: string;               // MistakeType or DrillConcept key
  isCorrect: boolean;
  evDelta: number;
  grade?: HeroGrade;             // live hands only
  timestamp: number;
}

interface ConceptMastery {
  concept: string;
  level: MasteryLevel;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;              // correctAttempts / totalAttempts
  recentAccuracy: number;        // last 10 attempts
  totalEvDelta: number;
  lastAttemptAt: number;
  streak: number;                // consecutive correct
  bestStreak: number;
}

interface SessionSummary {
  id: string;
  type: "live" | "drill";
  handsPlayed: number;
  averageGrade?: HeroGrade;      // live only
  accuracy?: number;             // drill only
  totalEvDelta: number;
  weakestConcept: string | null;
  timestamp: number;
}
```

### Overall Stats

```typescript
interface OverallStats {
  totalHands: number;
  totalDrills: number;
  overallAccuracy: number;
  currentStreak: number;
  bestStreak: number;
  averageGrade: HeroGrade;       // rolling from recent live hands
}
```

### Store Shape

```typescript
interface ProgressState {
  // Data
  conceptMastery: Record<string, ConceptMastery>;
  sessions: SessionSummary[];
  attempts: AttemptRecord[];
  overallStats: OverallStats;

  // Mutations
  recordLiveHand: (analysis: AnalysisData) => void;
  recordDrillAttempt: (result: DrillResult, spot: DrillSpot) => void;
  recordDrillSession: (session: DrillSession) => void;

  // Queries
  getWeakestConcepts: (n: number) => ConceptMastery[];
  getStrongestConcepts: (n: number) => ConceptMastery[];
  getRecentSessions: (n: number) => SessionSummary[];
  getMasteryDistribution: () => Record<MasteryLevel, number>;
}
```

## Mastery Level Computation

Pure function: `computeMasteryLevel(mastery: ConceptMastery): MasteryLevel`

```
if totalAttempts === 0 → "unseen"
if totalAttempts < 5 OR accuracy < 0.4 → "learning"
if recentAccuracy < 0.6 → "practiced"
if totalAttempts < 10 OR recentAccuracy < 0.8 → "solid"
if recentAccuracy >= 0.8 AND totalAttempts >= 15 AND streak >= 3 → "mastered"
else → "solid"
```

`recentAccuracy` is computed from the last 10 `AttemptRecord` entries for that concept.

## Recording Logic

### `recordLiveHand(analysis: AnalysisData)`

For each mistake in the analysis:
- Create an `AttemptRecord` with `source: "live"`, `concept: mistake.type`, `isCorrect: false`, `evDelta: -mistake.evLoss`
- Update the corresponding `ConceptMastery` entry

For each decision without a mistake:
- Create an `AttemptRecord` with `isCorrect: true`, `evDelta: decision.heroEv ?? 0`
- Map the decision to a concept using the decision's round and action context

Update `overallStats.totalHands++`, recalculate `averageGrade`.

### `recordDrillAttempt(result: DrillResult, spot: DrillSpot)`

- Create an `AttemptRecord` with `source: "drill"`, `concept: spot.concept`, `isCorrect: result.isCorrect`, `evDelta: result.evDelta`
- Update the corresponding `ConceptMastery` entry
- Update `overallStats.totalDrills++`, recalculate `overallAccuracy`

### `recordDrillSession(session: DrillSession)`

- Create a `SessionSummary` with aggregate stats from the session
- Push to `sessions` array

## Live Hand Concept Mapping

For correct decisions (no mistake), we need to infer which concept was tested. Strategy:

1. If the decision has a `coaching?.concept` field (from M3), use that
2. Otherwise, map from action + round:
   - preflop bet/raise → `"open_raise"` (simplified)
   - flop bet → `"cbet_value"`
   - turn/river bet → `"barrel"`
   - call → `"check_call"`
   - fold → `"cold_call"` (folding correctly is skill too)
   - check → `"pot_control"`

This is deliberately coarse — M6 (Coach Layer) will refine concept attribution.

## Progress Page UI

### Layout: 4 Sections

#### 1. Overview Cards (top row, 4 cards)

| Card | Content |
|------|---------|
| Hands Played | `overallStats.totalHands + totalDrills` with breakdown |
| Overall Accuracy | `overallStats.overallAccuracy` as percentage |
| Current Streak | `overallStats.currentStreak` (best: `bestStreak`) |
| Average Grade | `overallStats.averageGrade` with color |

#### 2. Mastery Grid

- Cards for each concept the user has attempted, colored by mastery level
- Color scheme: unseen=gray, learning=red, practiced=amber, solid=blue, mastered=emerald
- Each card shows: concept name, accuracy %, attempt count, mastery level badge
- Click navigates to `/practice/drills?concept=X`
- Grouped by category: Frequency, Sizing, Aggression, Equity Realization

#### 3. Session History

- Scrollable list of recent sessions (most recent first)
- Each row: relative date, type badge (Live/Drill), hands count, grade/accuracy, EV delta
- Max 20 shown, with "Show more" if needed

#### 4. Weakness Spotlight

- "Your top 3 leaks" card
- Shows weakest concepts by `recentAccuracy` (ascending)
- Each with concept name, recent accuracy, attempt count, "Drill this" CTA button

### Mobile Layout

- Overview cards: 2x2 grid
- Mastery grid: vertical scroll, 2 columns
- Session history: full-width list
- Weakness spotlight: full-width card

## Integration Points

1. **`gameStore.viewAnalysis()`** — after existing logic, add:
   ```typescript
   useProgressStore.getState().recordLiveHand(analysis);
   ```

2. **`drillStore.submitAnswer()`** — after existing logic, add:
   ```typescript
   useProgressStore.getState().recordDrillAttempt(result, spot);
   ```

3. **`drillStore` summary transition** — when `nextSpot()` transitions to summary, add:
   ```typescript
   useProgressStore.getState().recordDrillSession(session);
   ```

4. **`ProgressPage`** — replace placeholder with real components reading from `progressStore`

5. **`HomePage`** — add quick stats summary reading from `progressStore` (total hands, current streak, average grade)

## Testing Strategy

- Unit tests for `computeMasteryLevel()` — boundary cases for each level transition
- Unit tests for `recordLiveHand()` — verify AttemptRecord creation, ConceptMastery updates, streak tracking
- Unit tests for `recordDrillAttempt()` — verify accuracy calculation, streak, mastery level progression
- Integration test: live hand → progress update → mastery level change
- Integration test: drill session → session summary creation

## What's NOT in M4

- No localStorage persistence (M7)
- No onboarding or learning path recommendations (M5)
- No coach-quality trend explanations (M6)
- No opponent-specific tracking
- No grade distribution charts (future polish)
- No animated transitions between mastery levels (future polish)
