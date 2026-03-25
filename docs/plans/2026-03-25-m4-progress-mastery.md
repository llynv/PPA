# M4: Progress & Mastery — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a progress tracking engine and Progress page that answers "Am I getting better?" and "What should I work on next?" by aggregating data from live hands and drill sessions into concept-level mastery.

**Architecture:** New `progressStore` (Zustand) receives data from `gameStore.viewAnalysis()` and `drillStore.submitAnswer()`/`nextSpot()` via side-effect calls. Pure functions compute mastery levels. Progress page reads from progressStore. No persistence (M7).

**Tech Stack:** React 18, TypeScript, Zustand, Vitest, Tailwind CSS

**Convention:** This codebase uses DOUBLE QUOTES consistently. Always use double quotes, never single quotes.

---

### Task 1: Progress Types

**Files:**
- Create: `src/types/progress.ts`

**What to build:**

Create the progress domain types. These are consumed by the progress store and UI.

```typescript
import type { HeroGrade } from "./poker";

export type MasteryLevel = "unseen" | "learning" | "practiced" | "solid" | "mastered";

export interface AttemptRecord {
  id: string;
  source: "live" | "drill";
  concept: string;
  isCorrect: boolean;
  evDelta: number;
  grade?: HeroGrade;
  timestamp: number;
}

export interface ConceptMastery {
  concept: string;
  level: MasteryLevel;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  recentAccuracy: number;
  totalEvDelta: number;
  lastAttemptAt: number;
  streak: number;
  bestStreak: number;
}

export interface SessionSummary {
  id: string;
  type: "live" | "drill";
  handsPlayed: number;
  averageGrade?: HeroGrade;
  accuracy?: number;
  totalEvDelta: number;
  weakestConcept: string | null;
  timestamp: number;
}

export interface OverallStats {
  totalHands: number;
  totalDrills: number;
  overallAccuracy: number;
  currentStreak: number;
  bestStreak: number;
  averageGrade: HeroGrade;
}
```

**No tests needed** — this is a pure type file with no runtime logic.

**Commit:** `feat(m4): add progress domain types`

---

### Task 2: Mastery Level Computation + Tests

**Files:**
- Create: `src/lib/progress.ts`
- Create: `src/lib/__tests__/progress.test.ts`

**What to build:**

Pure function `computeMasteryLevel` and helper `computeRecentAccuracy`.

**Implementation (`src/lib/progress.ts`):**

```typescript
import type { MasteryLevel, ConceptMastery, AttemptRecord } from "../types/progress";

const RECENT_WINDOW = 10;
const LEARNING_MIN_ATTEMPTS = 5;
const LEARNING_MIN_ACCURACY = 0.4;
const SOLID_MIN_ATTEMPTS = 10;
const SOLID_MIN_RECENT_ACCURACY = 0.6;
const MASTERED_MIN_ATTEMPTS = 15;
const MASTERED_MIN_RECENT_ACCURACY = 0.8;
const MASTERED_MIN_STREAK = 3;

export function computeMasteryLevel(mastery: ConceptMastery): MasteryLevel {
  if (mastery.totalAttempts === 0) return "unseen";
  if (mastery.totalAttempts < LEARNING_MIN_ATTEMPTS || mastery.accuracy < LEARNING_MIN_ACCURACY) return "learning";
  if (mastery.recentAccuracy < SOLID_MIN_RECENT_ACCURACY) return "practiced";
  if (
    mastery.recentAccuracy >= MASTERED_MIN_RECENT_ACCURACY &&
    mastery.totalAttempts >= MASTERED_MIN_ATTEMPTS &&
    mastery.streak >= MASTERED_MIN_STREAK
  ) return "mastered";
  return "solid";
}

export function computeRecentAccuracy(attempts: AttemptRecord[], concept: string): number {
  const conceptAttempts = attempts
    .filter((a) => a.concept === concept)
    .slice(-RECENT_WINDOW);
  if (conceptAttempts.length === 0) return 0;
  return conceptAttempts.filter((a) => a.isCorrect).length / conceptAttempts.length;
}

export function createEmptyMastery(concept: string): ConceptMastery {
  return {
    concept,
    level: "unseen",
    totalAttempts: 0,
    correctAttempts: 0,
    accuracy: 0,
    recentAccuracy: 0,
    totalEvDelta: 0,
    lastAttemptAt: 0,
    streak: 0,
    bestStreak: 0,
  };
}
```

**Tests (`src/lib/__tests__/progress.test.ts`):**

Test `computeMasteryLevel` with boundary cases for each level:

1. `unseen` — totalAttempts === 0
2. `learning` — totalAttempts < 5
3. `learning` — totalAttempts >= 5 but accuracy < 0.4
4. `practiced` — accuracy >= 0.4, recentAccuracy < 0.6
5. `solid` — recentAccuracy >= 0.6, totalAttempts >= 10, but recentAccuracy < 0.8
6. `solid` — recentAccuracy >= 0.8 but totalAttempts < 15
7. `solid` — recentAccuracy >= 0.8, totalAttempts >= 15 but streak < 3
8. `mastered` — recentAccuracy >= 0.8, totalAttempts >= 15, streak >= 3

Test `computeRecentAccuracy`:
9. Empty attempts → 0
10. 5 attempts, 3 correct → 0.6
11. 15 attempts, only last 10 counted → correct ratio of last 10

Test `createEmptyMastery`:
12. Returns all zeros with `unseen` level

Build each test as a `describe` block with `it` cases. Use the pattern:

```typescript
import { describe, it, expect } from "vitest";
import { computeMasteryLevel, computeRecentAccuracy, createEmptyMastery } from "../progress";
import type { ConceptMastery, AttemptRecord } from "../../types/progress";

function makeMastery(overrides: Partial<ConceptMastery>): ConceptMastery {
  return { ...createEmptyMastery("test_concept"), ...overrides };
}
```

**Run:** `npx vitest run src/lib/__tests__/progress.test.ts`
**Expected:** 12 tests pass

**Commit:** `feat(m4): add mastery level computation with tests`

---

### Task 3: Progress Store — Core State + Record Methods

**Files:**
- Create: `src/store/progressStore.ts`
- Create: `src/store/__tests__/progressStore.test.ts`

**What to build:**

Zustand store with state shape and the three record methods.

**Implementation (`src/store/progressStore.ts`):**

The store needs:

**State:**
- `conceptMastery: Record<string, ConceptMastery>` — keyed by concept string
- `sessions: SessionSummary[]`
- `attempts: AttemptRecord[]`
- `overallStats: OverallStats`

**Actions:**

`recordLiveHand(analysis: AnalysisData)`:
- For each mistake with a `type` field: create AttemptRecord with `isCorrect: false`, `evDelta: -mistake.evLoss`, `concept: mistake.type`
- For each decision WITHOUT a matching mistake: create AttemptRecord with `isCorrect: true`, `evDelta: decision.heroEv ?? 0`, concept mapped from decision round/action (use `inferLiveHandConcept` helper below)
- Update conceptMastery for each touched concept
- Increment `overallStats.totalHands`
- Recalculate `overallStats.averageGrade` using GRADE_VALUES from analysis.ts pattern
- Create and push a SessionSummary with `type: "live"`

`inferLiveHandConcept(decision: Decision): string`:
Helper that maps a correct decision to a concept string:
- preflop + (bet|raise) → `"open_raise"`
- flop + (bet|raise) → `"cbet_value"`
- turn + (bet|raise) → `"barrel"`
- river + (bet|raise) → `"value_bet_thin"`
- any + call → `"check_call"`
- any + fold → `"cold_call"`
- any + check → `"pot_control"`

`recordDrillAttempt(result: DrillResult, spot: DrillSpot)`:
- Create AttemptRecord with `source: "drill"`, `concept: spot.concept`, `isCorrect: result.isCorrect`, `evDelta: result.evDelta`
- Update conceptMastery for `spot.concept`
- Increment `overallStats.totalDrills`
- Recalculate `overallStats.overallAccuracy`

`recordDrillSession(session: DrillSession)`:
- Create SessionSummary with `type: "drill"`, aggregate stats from session.results
- Push to sessions array

**Internal helper `updateConceptMastery(concept, attempt)`:**
- Get or create ConceptMastery entry
- Increment totalAttempts, correctAttempts (if correct)
- Update accuracy = correctAttempts / totalAttempts
- Update streak (reset to 0 if incorrect, increment if correct)
- Update bestStreak
- Update totalEvDelta
- Update lastAttemptAt
- Recalculate recentAccuracy using `computeRecentAccuracy`
- Recalculate level using `computeMasteryLevel`

**Tests (`src/store/__tests__/progressStore.test.ts`):**

1. Initial state has empty conceptMastery, sessions, attempts, and default overallStats
2. `recordDrillAttempt` — correct attempt creates AttemptRecord, updates mastery, increments totalDrills
3. `recordDrillAttempt` — incorrect attempt resets streak, decrements accuracy
4. `recordDrillAttempt` — 5 correct attempts transitions mastery from unseen → learning → practiced (verify level progression)
5. `recordDrillSession` — creates SessionSummary with correct aggregates
6. `recordLiveHand` — creates AttemptRecords for mistakes (isCorrect: false) and clean decisions (isCorrect: true)
7. `recordLiveHand` — increments totalHands, creates live SessionSummary

Use mock AnalysisData, DrillResult, and DrillSpot objects. Import types from their respective modules.

For mock AnalysisData, create a helper:
```typescript
function mockAnalysis(overrides?: Partial<AnalysisData>): AnalysisData {
  return {
    heroGrade: "B",
    decisions: [
      {
        round: "flop",
        heroAction: "call",
        optimalAction: "call",
        optimalFrequencies: { fold: 0.1, call: 0.7, raise: 0.2 },
        evDiff: 0,
      },
    ],
    totalEvLoss: 2.5,
    totalHeroEv: 1.0,
    mistakes: [],
    handNumber: 1,
    ...overrides,
  };
}
```

**Run:** `npx vitest run src/store/__tests__/progressStore.test.ts`
**Expected:** 7 tests pass

**Commit:** `feat(m4): add progressStore with record methods and tests`

---

### Task 4: Progress Store — Query Methods

**Files:**
- Modify: `src/store/progressStore.ts`
- Modify: `src/store/__tests__/progressStore.test.ts`

**What to build:**

Add query methods to progressStore:

```typescript
getWeakestConcepts(n: number): ConceptMastery[]
// Sort by recentAccuracy ascending (worst first), filter out unseen, take n

getStrongestConcepts(n: number): ConceptMastery[]
// Sort by recentAccuracy descending (best first), filter out unseen, take n

getRecentSessions(n: number): SessionSummary[]
// Return last n sessions (most recent first)

getMasteryDistribution(): Record<MasteryLevel, number>
// Count concepts at each mastery level
```

These are getter functions on the store, not actions that modify state.

**Tests to add:**

8. `getWeakestConcepts` — with 3 concepts at different accuracies, returns them sorted ascending
9. `getStrongestConcepts` — returns sorted descending, excludes unseen
10. `getRecentSessions` — returns most recent n sessions
11. `getMasteryDistribution` — counts concepts per level correctly

Seed the store by calling `recordDrillAttempt` multiple times with different concepts before querying.

**Run:** `npx vitest run src/store/__tests__/progressStore.test.ts`
**Expected:** 11 tests pass

**Commit:** `feat(m4): add progress query methods with tests`

---

### Task 5: Integration — Wire gameStore and drillStore to progressStore

**Files:**
- Modify: `src/store/gameStore.ts:756-770` (viewAnalysis action)
- Modify: `src/store/drillStore.ts:76-110` (submitAnswer action)
- Modify: `src/store/drillStore.ts:112-126` (nextSpot action)

**What to build:**

Add side-effect calls from existing stores into progressStore.

**In `src/store/gameStore.ts`**, at the top add import:
```typescript
import { useProgressStore } from "./progressStore";
```

In `viewAnalysis()` (line 769, after the `set()` call), add:
```typescript
useProgressStore.getState().recordLiveHand(analysis);
```

**In `src/store/drillStore.ts`**, at the top add import:
```typescript
import { useProgressStore } from "./progressStore";
```

In `submitAnswer()` (line 109, after the `set()` call), add:
```typescript
const spot = session.queue[session.currentIndex];
useProgressStore.getState().recordDrillAttempt(result, spot);
```
Note: `spot` is already defined at line 80, but the reference here is for clarity — reuse the existing `spot` variable.

In `nextSpot()` (line 117-118, inside the `if (nextIndex >= session.queue.length)` block), change to:
```typescript
if (nextIndex >= session.queue.length) {
  if (session) {
    useProgressStore.getState().recordDrillSession(session);
  }
  set({ phase: "summary", currentResult: null });
}
```

**Tests:**

No new test file — verify existing tests still pass. The integration is tested through the existing gameStore and drillStore tests, plus the progressStore unit tests from Tasks 3-4.

**Run:** `npx vitest run`
**Expected:** All existing tests pass (198+)

**Commit:** `feat(m4): wire gameStore and drillStore to progressStore`

---

### Task 6: Overview Cards Component

**Files:**
- Create: `src/components/progress/OverviewCards.tsx`

**What to build:**

A responsive card grid showing top-level stats from progressStore.

Four cards in a 2x2 grid (mobile) / 4-column row (desktop):

1. **Hands Played** — `overallStats.totalHands` + `overallStats.totalDrills` combined, with breakdown text
2. **Overall Accuracy** — `overallStats.overallAccuracy` as percentage with color coding
3. **Current Streak** — `overallStats.currentStreak` with "Best: X" subtitle
4. **Average Grade** — `overallStats.averageGrade` with grade color (reuse `getGradeColor` pattern from HeroGrade.tsx)

Each card: `bg-slate-800 rounded-xl p-4 shadow-lg` container. Number in large font, label in small muted text.

Read from `useProgressStore` with individual selectors for each stat.

Handle empty state: if totalHands + totalDrills === 0, show a message "Play some hands or drills to see your progress here."

**No unit tests** — pure presentational component. Tested via integration when wired into ProgressPage.

**Commit:** `feat(m4): add OverviewCards progress component`

---

### Task 7: Mastery Grid Component

**Files:**
- Create: `src/components/progress/MasteryGrid.tsx`

**What to build:**

A grid of concept mastery cards grouped by category.

Read `conceptMastery` from `useProgressStore`. Filter out `unseen` concepts. Group by category using the existing `MISTAKE_CATEGORY_MAP` from `src/lib/analysis.ts` (maps MistakeType → MistakeCategory) and a new `DRILL_CONCEPT_CATEGORY` mapping for DrillConcepts.

Add a `DRILL_CONCEPT_CATEGORY` mapping at the top of the file:
```typescript
const DRILL_CONCEPT_CATEGORY: Record<string, string> = {
  open_raise: "FREQUENCY", three_bet: "FREQUENCY", cold_call: "FREQUENCY",
  squeeze: "FREQUENCY", steal: "FREQUENCY",
  cbet_value: "AGGRESSION", cbet_bluff: "AGGRESSION", check_raise: "AGGRESSION",
  float: "EQUITY_REALIZATION", probe: "AGGRESSION",
  barrel: "AGGRESSION", pot_control: "EQUITY_REALIZATION",
  semi_bluff: "EQUITY_REALIZATION", check_call: "FREQUENCY",
  value_bet_thin: "AGGRESSION", bluff_catch: "EQUITY_REALIZATION",
  river_raise: "AGGRESSION", river_bluff: "AGGRESSION",
};
```

Also add `CONCEPT_LABELS` mapping for human-readable drill concept names:
```typescript
const CONCEPT_LABELS: Record<string, string> = {
  open_raise: "Open Raise", three_bet: "3-Bet", cold_call: "Cold Call",
  squeeze: "Squeeze", steal: "Steal",
  cbet_value: "Value C-Bet", cbet_bluff: "Bluff C-Bet", check_raise: "Check-Raise",
  float: "Float", probe: "Probe Bet",
  barrel: "Barrel", pot_control: "Pot Control",
  semi_bluff: "Semi-Bluff", check_call: "Check-Call",
  value_bet_thin: "Thin Value Bet", bluff_catch: "Bluff Catch",
  river_raise: "River Raise", river_bluff: "River Bluff",
};
```

Import `MISTAKE_TYPE_LABELS` from `src/lib/mistake-mappings.ts` for MistakeType labels.

For category labels, import from or duplicate the `CATEGORY_LABELS` used in SessionPatterns (or better, move to a shared location — but for now duplicate is fine since extraction is a polish concern).

**Mastery level colors:**
- `unseen` → `bg-slate-700 text-slate-500`
- `learning` → `bg-red-900/30 text-red-400 border-red-500/30`
- `practiced` → `bg-amber-900/30 text-amber-400 border-amber-500/30`
- `solid` → `bg-blue-900/30 text-blue-400 border-blue-500/30`
- `mastered` → `bg-emerald-900/30 text-emerald-400 border-emerald-500/30`

Each card shows:
- Concept name (from CONCEPT_LABELS or MISTAKE_TYPE_LABELS)
- Mastery level badge (pill with level name)
- Accuracy percentage
- Attempt count
- Click handler → `navigate(\`/practice/drills?concept=\${concept}\`)`

Group cards under category headers. Use `grid grid-cols-2 md:grid-cols-3 gap-3`.

Handle empty state: if no concepts have been attempted, show "No concepts tracked yet. Play hands or drills to start building mastery."

**No unit tests** — presentational component.

**Commit:** `feat(m4): add MasteryGrid progress component`

---

### Task 8: Session History Component

**Files:**
- Create: `src/components/progress/SessionHistory.tsx`

**What to build:**

A scrollable list of recent sessions from `progressStore.sessions`.

Read sessions via `useProgressStore((s) => s.sessions)`. Reverse to show most recent first. Show max 20.

Each row:
- Relative time (e.g., "2 min ago", "1 hr ago") — use a simple `formatRelativeTime` helper function within the file
- Type badge: "Live" (emerald) or "Drill" (amber)
- Hands count: "5 hands" or "12 drills"
- Grade (for live) or accuracy % (for drill)
- EV delta: "+1.5 BB" or "-3.2 BB" with green/red coloring

Use `bg-slate-800 rounded-xl` container, each row separated by `border-b border-slate-700`.

`formatRelativeTime(timestamp: number): string` helper:
```typescript
function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
```

Handle empty state: if no sessions, show "No sessions recorded yet."

**No unit tests** — presentational component.

**Commit:** `feat(m4): add SessionHistory progress component`

---

### Task 9: Weakness Spotlight Component

**Files:**
- Create: `src/components/progress/WeaknessSpotlight.tsx`

**What to build:**

A card showing the user's top 3 weakest concepts with drill CTAs.

Read from `useProgressStore` using `getWeakestConcepts(3)`.

Layout:
- Header: "Your Top Leaks" with a subtle warning icon
- 3 rows, each showing:
  - Concept name (using CONCEPT_LABELS or MISTAKE_TYPE_LABELS)
  - Recent accuracy as colored bar + percentage
  - Attempt count
  - "Drill this →" button linking to `/practice/drills?concept=X`

Use `bg-slate-800 rounded-xl p-4 md:p-6 shadow-lg`.

Accuracy bar colors: <40% = red, 40-60% = amber, 60-80% = blue, ≥80% = emerald.

Handle empty state: if fewer than 1 concept has been attempted, don't render (return null).

Import `MISTAKE_TYPE_LABELS` from `src/lib/mistake-mappings.ts`. Use the same `CONCEPT_LABELS` mapping from Task 7 — extract to a shared location if both components need it, or duplicate (since Task 7's MasteryGrid already has it). Best approach: create `src/lib/concept-labels.ts` that exports `CONCEPT_LABELS` and is consumed by both MasteryGrid and WeaknessSpotlight.

**Files (revised):**
- Create: `src/lib/concept-labels.ts` — shared concept label mappings
- Create: `src/components/progress/WeaknessSpotlight.tsx`

**Commit:** `feat(m4): add WeaknessSpotlight component and shared concept labels`

---

### Task 10: Progress Page — Wire Everything Together

**Files:**
- Modify: `src/pages/ProgressPage.tsx` (complete rewrite)

**What to build:**

Replace the placeholder with the real Progress page wiring all four components.

```typescript
import { OverviewCards } from "../components/progress/OverviewCards";
import { MasteryGrid } from "../components/progress/MasteryGrid";
import { SessionHistory } from "../components/progress/SessionHistory";
import { WeaknessSpotlight } from "../components/progress/WeaknessSpotlight";

export function ProgressPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-8">
      <h1 className="text-2xl font-bold text-white">Progress</h1>

      <OverviewCards />

      <WeaknessSpotlight />

      <MasteryGrid />

      <SessionHistory />
    </div>
  );
}
```

**Commit:** `feat(m4): wire Progress page with all components`

---

### Task 11: HomePage — Add Quick Stats

**Files:**
- Modify: `src/pages/HomePage.tsx:48-53` (the Progress card in the 3-column grid)

**What to build:**

Update the Progress card in the HomePage grid to show live stats from progressStore when available.

Import `useProgressStore` and read `overallStats`. If `totalHands + totalDrills > 0`, show:
- "X hands · Y drills" instead of the placeholder text
- Current streak if > 0
- Average grade badge

If no data yet, keep the existing placeholder text but update it to: "Play hands or drills to start tracking your progress."

Also update the hero section text (lines 7-9) to remove "M1 foundation" since we're now on M4.

**Commit:** `feat(m4): add live progress stats to HomePage`

---

### Task 12: Integration Tests

**Files:**
- Create: `src/store/__tests__/progressStore.integration.test.ts`

**What to build:**

End-to-end flow tests that verify the full pipeline:

1. **Live hand → progress update:** Call `gameStore.viewAnalysis()` with a hand that has mistakes → verify progressStore has the correct AttemptRecords, ConceptMastery entries, and SessionSummary
2. **Drill attempt → mastery progression:** Submit 15 correct drill attempts for the same concept → verify mastery level progresses through learning → practiced → solid → mastered
3. **Drill session → session summary:** Complete a full drill session → verify SessionSummary created with correct aggregates
4. **Weakness query accuracy:** Record attempts with varying accuracy across 3 concepts → verify `getWeakestConcepts(2)` returns the correct two

These tests exercise the integration points from Task 5 and the full data flow.

Setup: Before each test, create fresh stores using `useProgressStore.setState()` and `useGameStore.setState()` / `useDrillStore.setState()` to reset.

**Run:** `npx vitest run src/store/__tests__/progressStore.integration.test.ts`
**Expected:** 4 tests pass

**Commit:** `feat(m4): add progress integration tests`

---

### Task Summary

| # | Task | Type | Files | Tests |
|---|------|------|-------|-------|
| 1 | Progress Types | types | 1 create | 0 |
| 2 | Mastery Computation | logic | 2 create | 12 |
| 3 | Progress Store Core | store | 2 create | 7 |
| 4 | Query Methods | store | 2 modify | 4 |
| 5 | Store Integration | wiring | 3 modify | 0 (existing pass) |
| 6 | Overview Cards | UI | 1 create | 0 |
| 7 | Mastery Grid | UI | 1 create | 0 |
| 8 | Session History | UI | 1 create | 0 |
| 9 | Weakness Spotlight | UI | 2 create | 0 |
| 10 | Progress Page | UI | 1 modify | 0 |
| 11 | HomePage Stats | UI | 1 modify | 0 |
| 12 | Integration Tests | test | 1 create | 4 |

**Total:** ~15 files, ~27 tests, 12 commits
