# M2: Practice Split — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split `/practice` into a mode selector, relocate the live table to `/practice/live`, and build a spot drill engine at `/practice/drills` with curated spots and a full feedback mini-dashboard.

**Architecture:** New routes under `/practice/*` with nested React Router. New `drillStore.ts` for drill state (independent from `gameStore`). Spot library as static data in `src/data/`. Drill feedback reuses patterns from existing analysis components. Engine evaluation via `evaluateDecision()`.

**Tech Stack:** React 18 + TypeScript + Zustand + React Router v6 + Recharts + Tailwind CSS + Vitest + Testing Library

**Design doc:** `docs/plans/2026-03-24-m2-practice-split-design.md`

---

## Task 1: Route Restructuring

**Files:**
- Modify: `src/App.tsx` — add nested routes under `/practice`
- Rename: `src/pages/PracticePage.tsx` → becomes mode selector
- Create: `src/pages/LiveTablePage.tsx` — today's PracticePage logic
- Modify: `src/components/layout/AppShell.tsx` — update practice route detection
- Modify: `src/App.routes.test.tsx` — update/add route tests

**Step 1: Write the failing tests**

Add tests to `src/App.routes.test.tsx`:

```typescript
// New tests for M2 routes
test('renders mode selector at /practice with Live Table and Spot Drills options', async () => {
  render(
    <MemoryRouter initialEntries={['/practice']}>
      <App />
    </MemoryRouter>
  );
  expect(await screen.findByText(/Live Table/i)).toBeInTheDocument();
  expect(screen.getByText(/Spot Drills/i)).toBeInTheDocument();
});

test('renders LiveTablePage at /practice/live', async () => {
  render(
    <MemoryRouter initialEntries={['/practice/live']}>
      <App />
    </MemoryRouter>
  );
  // GameSettings is rendered at "settings" phase
  expect(await screen.findByText(/Game Settings/i)).toBeInTheDocument();
});

test('renders DrillsPage at /practice/drills', async () => {
  render(
    <MemoryRouter initialEntries={['/practice/drills']}>
      <App />
    </MemoryRouter>
  );
  expect(await screen.findByText(/Spot Drills/i)).toBeInTheDocument();
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/App.routes.test.tsx`
Expected: FAIL — routes don't exist yet

**Step 3: Create LiveTablePage**

Create `src/pages/LiveTablePage.tsx` — extract today's `PracticePage` logic:

```typescript
import { Navigate } from "react-router-dom";
import { PokerTable } from "../components/game/PokerTable";
import { GameSettings } from "../components/settings/GameSettings";
import { useGameStore } from "../store/gameStore";

export function LiveTablePage() {
    const gamePhase = useGameStore((s) => s.gamePhase);

    if (gamePhase === "settings") {
        return <GameSettings />;
    }

    if (gamePhase === "playing" || gamePhase === "showdown") {
        return <PokerTable />;
    }

    return <Navigate to="/review" replace />;
}
```

**Step 4: Create DrillsPage placeholder**

Create `src/pages/DrillsPage.tsx`:

```typescript
export function DrillsPage() {
    return (
        <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-neutral-100 mb-2">
                    Spot Drills
                </h1>
                <p className="text-neutral-400">
                    Practice isolated decisions with instant GTO feedback.
                </p>
            </div>
        </div>
    );
}
```

**Step 5: Rewrite PracticePage as mode selector**

Update `src/pages/PracticePage.tsx`:

```typescript
import { Link, Outlet, useLocation } from "react-router-dom";

export function PracticePage() {
    const location = useLocation();
    const isRoot = location.pathname === "/practice";

    if (!isRoot) {
        return <Outlet />;
    }

    return (
        <div className="flex-1 flex items-center justify-center p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl w-full">
                <Link
                    to="/practice/live"
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-emerald-500/50 transition-colors group"
                >
                    <h2 className="text-xl font-bold text-neutral-100 mb-2 group-hover:text-emerald-400">
                        Live Table
                    </h2>
                    <p className="text-neutral-400 text-sm">
                        Play full hands against AI opponents. Review analysis after each hand.
                    </p>
                </Link>
                <Link
                    to="/practice/drills"
                    className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 hover:border-amber-500/50 transition-colors group"
                >
                    <h2 className="text-xl font-bold text-neutral-100 mb-2 group-hover:text-amber-400">
                        Spot Drills
                    </h2>
                    <p className="text-neutral-400 text-sm">
                        Practice isolated decisions with instant GTO feedback. Build muscle memory.
                    </p>
                </Link>
            </div>
        </div>
    );
}
```

**Step 6: Update App.tsx routes**

Update `src/App.tsx`:

```typescript
import { AppShell } from "./components/layout/AppShell";
import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { PracticePage } from "./pages/PracticePage";
import { LiveTablePage } from "./pages/LiveTablePage";
import { DrillsPage } from "./pages/DrillsPage";
import { ReviewPage } from "./pages/ReviewPage";
import { ProgressPage } from "./pages/ProgressPage";
import { LibraryPage } from "./pages/LibraryPage";

function App() {
    return (
        <Routes>
            <Route element={<AppShell />}>
                <Route index element={<HomePage />} />
                <Route path="practice" element={<PracticePage />}>
                    <Route path="live" element={<LiveTablePage />} />
                    <Route path="drills" element={<DrillsPage />} />
                </Route>
                <Route path="review" element={<ReviewPage />} />
                <Route path="progress" element={<ProgressPage />} />
                <Route path="library" element={<LibraryPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}

export default App;
```

**Step 7: Update AppShell route detection**

In `src/components/layout/AppShell.tsx`, update `isPracticeRoute` to match nested routes:

```typescript
const isPracticeRoute = location.pathname.startsWith("/practice");
```

**Step 8: Update existing route tests**

Update the existing test for `/practice` — it should now show the mode selector instead of `GameSettings`. Update the test that checks for "Game Settings" at `/practice` to check at `/practice/live` instead.

**Step 9: Run tests to verify they pass**

Run: `npx vitest run src/App.routes.test.tsx`
Expected: PASS — all route tests including new ones

**Step 10: Run full test suite and type-check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: 161+ tests pass, no type errors

**Step 11: Commit**

```bash
git add -A
git commit -m "feat(m2): split practice into mode selector with live table and drills routes"
```

---

## Task 2: Drill Types and Spot Library

**Files:**
- Create: `src/types/drill.ts` — drill-specific types
- Create: `src/data/drillSpots.ts` — curated spot library (start with 10 spots)
- Create: `src/data/__tests__/drillSpots.test.ts` — validate spot data integrity

**Step 1: Write the failing test**

Create `src/data/__tests__/drillSpots.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { DRILL_SPOTS } from '../drillSpots';
import type { DrillSpot } from '../../types/drill';

describe('drillSpots library', () => {
  it('has at least 10 spots', () => {
    expect(DRILL_SPOTS.length).toBeGreaterThanOrEqual(10);
  });

  it('every spot has a unique id', () => {
    const ids = DRILL_SPOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every spot has required fields', () => {
    for (const spot of DRILL_SPOTS) {
      expect(spot.id).toBeTruthy();
      expect(spot.name).toBeTruthy();
      expect(['preflop', 'flop', 'turn', 'river']).toContain(spot.category);
      expect([1, 2, 3]).toContain(spot.difficulty);
      expect(spot.heroCards).toHaveLength(2);
      expect(spot.decisionContext).toBeDefined();
      expect(spot.decisionContext.holeCards).toHaveLength(2);
      expect(spot.potSize).toBeGreaterThan(0);
    }
  });

  it('has spots in every category', () => {
    const categories = new Set(DRILL_SPOTS.map((s) => s.category));
    expect(categories).toContain('preflop');
    expect(categories).toContain('flop');
    expect(categories).toContain('turn');
    expect(categories).toContain('river');
  });

  it('every spot produces a valid DecisionResult from evaluateDecision', () => {
    // Import lazily to avoid circular deps
    const { evaluateDecision } = require('../../lib/poker-engine/decision');
    for (const spot of DRILL_SPOTS) {
      const result = evaluateDecision(spot.decisionContext);
      expect(result.optimalAction).toBeTruthy();
      expect(result.frequencies).toBeDefined();
      expect(result.frequencies.fold + result.frequencies.call + result.frequencies.raise).toBeCloseTo(1, 0);
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/__tests__/drillSpots.test.ts`
Expected: FAIL — files don't exist yet

**Step 3: Create drill types**

Create `src/types/drill.ts` with `DrillSpot`, `DrillSession`, `DrillResult`, `DrillFilters`, `SpotCategory`, `DrillConcept` types as defined in the design doc. Reference `Card`, `Position`, `ActionType`, `DecisionContext`, `DecisionResult` from `./poker`.

**Step 4: Create spot library**

Create `src/data/drillSpots.ts` with 10+ curated spots covering all four streets. Each spot must have a valid `DecisionContext` that `evaluateDecision()` can process.

Build spots using existing poker engine types:
- Use real card objects `{ suit, rank }`
- Set realistic stack/pot sizes in BB terms (multiply by bigBlind=10)
- Provide accurate `actionHistory` arrays
- Cover concepts: `open_raise`, `cbet_value`, `cbet_bluff`, `check_raise`, `barrel`, `value_bet_thin`, `bluff_catch`, etc.

**Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/__tests__/drillSpots.test.ts`
Expected: PASS — all spot validation tests pass

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(m2): add drill types and curated spot library with 10+ spots"
```

---

## Task 3: Drill Store

**Files:**
- Create: `src/store/drillStore.ts`
- Create: `src/store/__tests__/drillStore.test.ts`

**Step 1: Write the failing test**

Create `src/store/__tests__/drillStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useDrillStore } from '../drillStore';

describe('drillStore', () => {
  beforeEach(() => {
    useDrillStore.getState().resetSession();
  });

  it('starts with null session in setup phase', () => {
    const state = useDrillStore.getState();
    expect(state.phase).toBe('setup');
    expect(state.session).toBeNull();
  });

  it('startSession creates a session with filtered spots', () => {
    useDrillStore.getState().startSession({ categories: ['preflop'], difficulties: [], concepts: [] });
    const state = useDrillStore.getState();
    expect(state.phase).toBe('drilling');
    expect(state.session).not.toBeNull();
    expect(state.session!.queue.length).toBeGreaterThan(0);
    expect(state.session!.queue.every(s => s.category === 'preflop')).toBe(true);
  });

  it('startSession with empty filters includes all spots', () => {
    useDrillStore.getState().startSession({ categories: [], difficulties: [], concepts: [] });
    const state = useDrillStore.getState();
    expect(state.session!.queue.length).toBe(state.session!.allSpots.length);
  });

  it('submitAnswer evaluates and moves to feedback phase', () => {
    useDrillStore.getState().startSession({ categories: [], difficulties: [], concepts: [] });
    useDrillStore.getState().submitAnswer('fold');
    const state = useDrillStore.getState();
    expect(state.phase).toBe('feedback');
    expect(state.currentResult).not.toBeNull();
    expect(state.currentResult!.heroAction).toBe('fold');
  });

  it('nextSpot advances to next spot or summary if queue exhausted', () => {
    useDrillStore.getState().startSession({ categories: [], difficulties: [], concepts: [] });
    const queueLength = useDrillStore.getState().session!.queue.length;
    
    // Complete all spots
    for (let i = 0; i < queueLength; i++) {
      useDrillStore.getState().submitAnswer('call');
      if (i < queueLength - 1) {
        useDrillStore.getState().nextSpot();
        expect(useDrillStore.getState().phase).toBe('drilling');
      }
    }
    
    useDrillStore.getState().nextSpot();
    expect(useDrillStore.getState().phase).toBe('summary');
  });

  it('tracks streak correctly', () => {
    useDrillStore.getState().startSession({ categories: [], difficulties: [], concepts: [] });
    // We need to check if the submitted action matches the optimal
    // Just verify streak starts at 0 and results are tracked
    useDrillStore.getState().submitAnswer('fold');
    const state = useDrillStore.getState();
    expect(state.session!.results).toHaveLength(1);
  });

  it('resetSession returns to setup phase', () => {
    useDrillStore.getState().startSession({ categories: [], difficulties: [], concepts: [] });
    useDrillStore.getState().resetSession();
    const state = useDrillStore.getState();
    expect(state.phase).toBe('setup');
    expect(state.session).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/__tests__/drillStore.test.ts`
Expected: FAIL — store doesn't exist

**Step 3: Implement drillStore.ts**

Create `src/store/drillStore.ts`:

```typescript
import { create } from 'zustand';
import type { ActionType, DecisionResult } from '../types/poker';
import type { DrillSpot, DrillSession, DrillResult, DrillFilters } from '../types/drill';
import { DRILL_SPOTS } from '../data/drillSpots';
import { evaluateDecision } from '../lib/poker-engine/decision';

type DrillPhase = 'setup' | 'drilling' | 'feedback' | 'summary';

interface DrillStore {
  phase: DrillPhase;
  session: DrillSession | null;
  currentResult: DrillResult | null;

  startSession: (filters: DrillFilters) => void;
  submitAnswer: (action: ActionType, raiseSize?: number) => void;
  nextSpot: () => void;
  resetSession: () => void;
}

function filterSpots(spots: DrillSpot[], filters: DrillFilters): DrillSpot[] {
  return spots.filter((s) => {
    if (filters.categories.length > 0 && !filters.categories.includes(s.category)) return false;
    if (filters.difficulties.length > 0 && !filters.difficulties.includes(s.difficulty)) return false;
    if (filters.concepts.length > 0 && !filters.concepts.includes(s.concept)) return false;
    return true;
  });
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function isCorrectAction(heroAction: ActionType, optimal: DecisionResult): boolean {
  // Map check→call, bet→raise for frequency comparison
  const mappedAction = heroAction === 'check' ? 'call' : heroAction === 'bet' ? 'raise' : heroAction;
  const freq = optimal.frequencies[mappedAction as 'fold' | 'call' | 'raise'] ?? 0;
  // Correct if hero chose an action with >= 15% frequency (valid mixed strategy)
  // or if hero chose the optimal action
  return heroAction === optimal.optimalAction || freq >= 0.15;
}

export const useDrillStore = create<DrillStore>((set, get) => ({
  phase: 'setup',
  session: null,
  currentResult: null,

  startSession: (filters) => {
    const filtered = filterSpots(DRILL_SPOTS, filters);
    const queue = shuffleArray(filtered);

    set({
      phase: 'drilling',
      session: {
        allSpots: DRILL_SPOTS,
        queue,
        currentIndex: 0,
        results: [],
        filters,
        streak: 0,
        bestStreak: 0,
      },
      currentResult: null,
    });
  },

  submitAnswer: (action, raiseSize) => {
    const { session } = get();
    if (!session || session.currentIndex >= session.queue.length) return;

    const spot = session.queue[session.currentIndex];
    const optimalResult = evaluateDecision(spot.decisionContext);
    const correct = isCorrectAction(action, optimalResult);
    const heroEv = optimalResult.evByAction[
      action === 'check' ? 'call' : action === 'bet' ? 'raise' : action as 'fold' | 'call' | 'raise'
    ] ?? 0;
    const optimalEv = Math.max(optimalResult.evByAction.fold, optimalResult.evByAction.call, optimalResult.evByAction.raise);

    const result: DrillResult = {
      spotId: spot.id,
      heroAction: action,
      heroRaiseSize: raiseSize,
      isCorrect: correct,
      evDelta: heroEv - optimalEv,
      optimalResult,
      timestamp: Date.now(),
    };

    const newStreak = correct ? session.streak + 1 : 0;
    const newBestStreak = Math.max(session.bestStreak, newStreak);

    set({
      phase: 'feedback',
      currentResult: result,
      session: {
        ...session,
        results: [...session.results, result],
        streak: newStreak,
        bestStreak: newBestStreak,
      },
    });
  },

  nextSpot: () => {
    const { session } = get();
    if (!session) return;

    const nextIndex = session.currentIndex + 1;
    if (nextIndex >= session.queue.length) {
      set({ phase: 'summary', currentResult: null });
    } else {
      set({
        phase: 'drilling',
        currentResult: null,
        session: { ...session, currentIndex: nextIndex },
      });
    }
  },

  resetSession: () => {
    set({ phase: 'setup', session: null, currentResult: null });
  },
}));
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/__tests__/drillStore.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(m2): add drill store with session management, answer evaluation, and streak tracking"
```

---

## Task 4: Drill Setup UI

**Files:**
- Create: `src/components/drill/DrillSetup.tsx`
- Update: `src/pages/DrillsPage.tsx` — wire up DrillSetup

**Step 1: Implement DrillSetup component**

Create `src/components/drill/DrillSetup.tsx`:

A form with:
- Category filter chips (Preflop / Flop / Turn / River) — toggle multi-select
- Difficulty filter chips (Beginner / Intermediate / Advanced)
- Spot count display ("X spots match your filters")
- "Start Drilling" primary CTA button

Uses `useDrillStore` to call `startSession(filters)`.

**Step 2: Wire up DrillsPage**

Update `src/pages/DrillsPage.tsx` to render `DrillSetup` when `phase === 'setup'`, placeholder for other phases.

**Step 3: Run tests and type-check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: All pass

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(m2): add drill setup UI with category and difficulty filters"
```

---

## Task 5: Spot Display UI

**Files:**
- Create: `src/components/drill/SpotBoard.tsx` — displays the frozen game state
- Create: `src/components/drill/DrillActionControls.tsx` — action buttons for drills

**Step 1: Implement SpotBoard**

Create `src/components/drill/SpotBoard.tsx`:

Displays:
- Hero cards (reuse `PlayingCard` component)
- Community cards (reuse `CommunityCards` style)
- Pot size, hero stack, villain stack
- Hero position and villain position labels
- Action context text (previousActions string)

**Step 2: Implement DrillActionControls**

Create `src/components/drill/DrillActionControls.tsx`:

Action buttons based on spot context:
- If `facingBet`: show Fold / Call / Raise (with size slider)
- If `firstToAct`: show Check / Bet (with size slider)
- Uses `useDrillStore.submitAnswer()` on click

Simpler than the full game ActionControls — no need for real-time stack/pot updates.

**Step 3: Wire up DrillsPage**

Update `src/pages/DrillsPage.tsx` to render `SpotBoard` + `DrillActionControls` when `phase === 'drilling'`.

**Step 4: Run tests and type-check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: All pass

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(m2): add spot board display and drill action controls"
```

---

## Task 6: Drill Feedback Mini-Dashboard

**Files:**
- Create: `src/components/drill/DrillFeedback.tsx`
- Create: `src/components/drill/FrequencyBar.tsx` — horizontal frequency bars

**Step 1: Implement FrequencyBar**

Create `src/components/drill/FrequencyBar.tsx`:

A horizontal stacked bar showing fold/call/raise percentages with hero's choice highlighted. Reuse `ACTION_COLORS` from `DecisionChart.tsx`.

**Step 2: Implement DrillFeedback**

Create `src/components/drill/DrillFeedback.tsx`:

Renders after hero submits an answer:

1. **Verdict banner** — Correct (green) / Acceptable (yellow) / Mistake (red)
2. **FrequencyBar** — GTO frequencies with hero action highlighted
3. **EV comparison** — Hero EV vs Optimal EV with delta
4. **Concept card** — Concept name + engine reasoning
5. **Context badges** — Board texture, draws, equity, pot odds, SPR (reuse pattern from `MistakeCard`)
6. **"Next Spot" button** — calls `useDrillStore.nextSpot()`

Consumes `currentResult` from drill store.

**Step 3: Wire up DrillsPage**

Update `src/pages/DrillsPage.tsx` to render `DrillFeedback` when `phase === 'feedback'`.

**Step 4: Run tests and type-check**

Run: `npx vitest run && npx tsc --noEmit`
Expected: All pass

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(m2): add drill feedback mini-dashboard with frequency bars, EV comparison, and concept explanation"
```

---

## Task 7: Drill Session Summary

**Files:**
- Create: `src/components/drill/DrillSummary.tsx`

**Step 1: Implement DrillSummary**

Create `src/components/drill/DrillSummary.tsx`:

Shows after all spots in queue are completed:
- Total spots drilled
- Accuracy (correct / total as percentage)
- Best streak
- Average EV delta
- Breakdown by category (table)
- "Drill Again" CTA (calls `resetSession()`)
- "Back to Practice" link

**Step 2: Wire up DrillsPage**

Update `src/pages/DrillsPage.tsx` to render `DrillSummary` when `phase === 'summary'`.

**Step 3: Run all tests, type-check, and build**

Run: `npx vitest run && npx tsc --noEmit && npx vite build`
Expected: All pass, build succeeds

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(m2): add drill session summary with accuracy, streaks, and category breakdown"
```

---

## Task 8: Expand Spot Library to 30+ Spots

**Files:**
- Modify: `src/data/drillSpots.ts` — expand from 10 to 30+ spots
- Modify: `src/data/__tests__/drillSpots.test.ts` — update minimum count assertion

**Step 1: Update test threshold**

In `src/data/__tests__/drillSpots.test.ts`, change:
```typescript
expect(DRILL_SPOTS.length).toBeGreaterThanOrEqual(30);
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/__tests__/drillSpots.test.ts`
Expected: FAIL — only have ~10 spots

**Step 3: Add 20+ more spots**

Expand `src/data/drillSpots.ts` covering:
- Preflop: 10-12 spots (open raise positions, 3-bet scenarios, squeeze, steal)
- Flop: 12-15 spots (cbet value/bluff, check-raise, float, probe, various textures)
- Turn: 8-10 spots (barrel, pot control, semi-bluff, delayed cbet)
- River: 6-8 spots (thin value bet, bluff catch, river raise)

Each spot needs valid `DecisionContext` with realistic action histories and board states.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/__tests__/drillSpots.test.ts`
Expected: PASS — 30+ spots, all valid

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(m2): expand spot library to 30+ curated drill spots across all streets"
```

---

## Task 9: Integration Test and Polish

**Files:**
- Modify: `src/App.routes.test.tsx` — add integration tests for drill flow
- Modify: `src/components/layout/AppShell.tsx` — update nav active state for nested practice routes
- Modify: `src/pages/ReviewPage.tsx` — ensure review exit actions work with new route structure

**Step 1: Add integration tests**

Add to `src/App.routes.test.tsx`:

```typescript
test('practice nav item is active on /practice/live', async () => {
  render(
    <MemoryRouter initialEntries={['/practice/live']}>
      <App />
    </MemoryRouter>
  );
  const practiceLink = await screen.findByRole('link', { name: /practice/i });
  expect(practiceLink.className).toContain('text-emerald');
});

test('practice nav item is active on /practice/drills', async () => {
  render(
    <MemoryRouter initialEntries={['/practice/drills']}>
      <App />
    </MemoryRouter>
  );
  const practiceLink = await screen.findByRole('link', { name: /practice/i });
  expect(practiceLink.className).toContain('text-emerald');
});
```

**Step 2: Fix AppShell nav active state**

In `AppShell.tsx`, ensure the Practice nav item is highlighted for `/practice`, `/practice/live`, and `/practice/drills`. The `NavLink` `to="/practice"` should use `end={false}` or a custom `isActive` check:

```typescript
// In the nav rendering, use:
className={({ isActive }) =>
  isActive || location.pathname.startsWith('/practice')
    ? 'text-emerald-400 ...'
    : 'text-neutral-500 ...'
}
```

**Step 3: Update ReviewPage exit actions**

In `src/pages/ReviewPage.tsx`, ensure "Back to Practice" navigates to `/practice` (mode selector) and "New Game" navigates to `/practice/live`.

**Step 4: Run full test suite, type-check, and build**

Run: `npx vitest run && npx tsc --noEmit && npx vite build`
Expected: All pass, build succeeds

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(m2): polish nav active states, review exit actions, and add integration tests"
```

---

## Task 10: Final Verification

**Step 1: Run full verification**

```bash
npx vitest run
npx tsc --noEmit
npx vite build
```

Expected: All tests pass (170+), no type errors, build succeeds.

**Step 2: Manual smoke test checklist**

- [ ] `/` — Home page loads
- [ ] `/practice` — Mode selector shows Live Table and Spot Drills cards
- [ ] `/practice/live` — Game Settings renders (settings phase)
- [ ] `/practice/drills` — Drill setup with filters renders
- [ ] Start a drill session → spot displays with cards, pot, actions
- [ ] Submit an answer → feedback mini-dashboard shows verdict, frequencies, EV
- [ ] Click Next Spot → next spot loads
- [ ] Complete all spots → summary shows accuracy and streaks
- [ ] "Drill Again" → returns to setup
- [ ] Practice nav item highlights correctly on all `/practice/*` routes
- [ ] Review exit actions navigate correctly

**Step 3: Commit any final fixes, then tag M2 complete**

```bash
git add -A
git commit -m "chore(m2): final polish and verification"
```
