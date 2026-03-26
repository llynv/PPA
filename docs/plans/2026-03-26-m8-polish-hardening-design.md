# M8: Polish & Hardening — Design Document

## Goal

Close all known bugs, eliminate code quality debt, add resilience patterns, and make the app production-ready. This is the "close the gaps" milestone — no new features, only fixes and hardening.

## Non-Goals

- No new features or pages
- No backend or cloud sync
- No full accessibility audit (color contrast, ARIA patterns) — noted for a future pass
- No bundle splitting beyond what React.lazy already provides

## Known Issues Resolved

| ID | Description | Severity |
|----|-------------|----------|
| I2 | `advanceRound` recursive calls when all-in | Medium |
| I6 | No side pot handling for multi-way all-in | High |
| I8 | `BettingRound` includes unused `'showdown'` value | Low |
| M1 | Duplicate `RANK_VALUES` definitions | Low |
| M4 | No burn cards dealt before community cards | Low |
| M6-1 | Circular dependency between coaching.ts and analysis.ts | Medium |
| M6-2 | Duplicated MISTAKE_TYPE_LABELS in coaching.ts | Low |

## Section 1: Side Pot Handling (I6)

The most impactful bug. Currently `resolveShowdown` treats the entire pot as a single unit and awards it to the best hand among all non-folded players. This is incorrect when players are all-in for different amounts.

### Algorithm

1. **Before showdown**, compute side pots:
   - Collect all non-folded players and their total contributions to the pot this hand
   - Sort by contribution amount (ascending)
   - For each distinct contribution level, create a pot that each eligible player contributed equally to
   - The main pot = smallest all-in amount × number of eligible players
   - Side pot(s) = incremental amounts × remaining eligible players

2. **During showdown**, resolve each pot independently:
   - For each pot, find the best hand among eligible contenders
   - Award that pot to the winner(s); split on ties
   - A player is eligible for a pot only if they contributed to it

### Data Model

```typescript
interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}
```

`resolveShowdown` will compute `SidePot[]` from the action history, then iterate pots from main → side, evaluating each against its eligible contenders.

### Edge Cases

- All players have equal stacks: single pot, no side pots (same as current behavior)
- Two players all-in for different amounts heads-up: main pot + remainder returned
- Three+ players with different stack depths: cascading side pots
- Player folds after contributing to pot: their contribution stays, they are ineligible

## Section 2: advanceRound Loop Fix (I2)

Replace synchronous recursion (`get().advanceRound()` calling itself) with a `while` loop that deals all remaining community cards in a single pass when all active players are all-in or folded.

```
while (no active players && currentRound !== 'river') {
  burn card
  deal community cards for next round
  advance currentRound
}
if (currentRound === 'river') resolveShowdown()
```

This produces a single `set()` call with the final state, eliminating intermediate renders.

## Section 3: Circular Dependency Fix (M6-1)

Extract `classifyMistake` from `analysis.ts` into `src/lib/mistake-classifier.ts`. Both `analysis.ts` and `coaching.ts` import from the new module. This breaks the `analysis.ts` ↔ `coaching.ts` cycle.

Dependency graph after fix:
```
analysis.ts → coaching.ts (generateEnhancedCoaching)
analysis.ts → mistake-classifier.ts (classifyMistake)
coaching.ts → mistake-classifier.ts (classifyMistake)
```

No circular reference.

## Section 4: Code Dedup & Type Cleanup

### Duplicate MISTAKE_TYPE_LABELS (M6-2)
Delete the private copy in `coaching.ts`, import from `mistake-mappings.ts`.

### Duplicate RANK_VALUES (M1)
Delete `RANK_VALUE_MAP` and `getRankValue` from `evaluator.ts`. Import `cardValue` from `deck.ts` and use it directly. The `evaluator.ts` internal `getRankValue(rank)` calls become `cardValue(rank)`.

### Remove 'showdown' from BettingRound (I8)
Remove `'showdown'` from the `BettingRound` union type. Fix the switch case in `analysis.ts` that handles it. `GamePhase` already has `'showdown'` which is the correct type for that concept.

### Duplicate getGradeColor
Extract `getGradeColor` from `OverviewCards.tsx`, `SessionHistory.tsx`, and `HeroGrade.tsx` into `src/lib/grade-utils.ts`. Import everywhere.

## Section 5: Error Boundaries

### Root boundary
Add a class-based `ErrorBoundary` component at `src/components/ErrorBoundary.tsx`. Wrap all routes in `App.tsx`. Fallback UI shows:
- Error icon
- "Something went wrong" message
- "Reset App" button that calls `window.location.reload()`

### Game boundary
Add a second boundary wrapping the game/analysis area specifically, so errors in the poker engine don't destroy the nav shell. Fallback: "This hand encountered an error. Start a new hand." with a button that resets game state.

## Section 6: Burn Cards (M4)

Before each community card deal in `advanceRound`, burn one card by calling `dealCards(remainingDeck, 1)` and discarding the result. Three burns total per hand: before flop, before turn, before river.

This changes the deck consumption from 5 community cards to 8 cards (3 burns + 5 community). The deck has 52 - (2 × numPlayers) cards remaining after dealing hole cards. For 6 players, that's 40 cards, so 8 is well within budget.

## Section 7: UX Polish

### Suspense fallback
Replace plain "Loading..." text with a `LoadingSpinner` component — a centered animated spinner with subtle branding. Add per-route `<Suspense>` inside `AppShell` so the nav chrome stays visible during lazy page loads.

### Hydration-aware Progress
ProgressPage checks `isHydrated` from `progressStore`. While `false`, show a minimal loading skeleton (pulsing placeholder blocks). Once `true`, render actual stats. This prevents the flash of "no data" empty states during IndexedDB hydration.

### LearnPage first-visit guidance
When `practicedCount === 0`, show an intro card above the curriculum: "Welcome to your learning path. Complete drills to unlock concepts and advance through the tiers below."

### Library page removal
Remove the `/library` route and its nav link. The `Learn` page already covers curriculum content. `LibraryPage.tsx` can be deleted. The nav will show: Home, Practice, Learn, Progress, Settings.

## Section 8: Accessibility

### Skip navigation + main landmark
- Add a visually-hidden "Skip to main content" `<a>` as the first element in `AppShell`
- Wrap `<Outlet>` in `<main id="main-content">`
- The skip link targets `#main-content`

### Focus management on route changes
Use a `useEffect` in `AppShell` that listens to `useLocation()` changes and calls `document.getElementById('main-content')?.focus()` with `tabIndex={-1}` on the `<main>` element. This announces the page change to screen readers.

## Files Changed

| File | Change |
|------|--------|
| `src/store/gameStore.ts` | Side pot algorithm, advanceRound loop fix, burn cards |
| `src/types/poker.ts` | Add `SidePot`, remove `'showdown'` from `BettingRound` |
| `src/lib/mistake-classifier.ts` | New — extracted `classifyMistake` |
| `src/lib/analysis.ts` | Import from mistake-classifier, fix BettingRound switch |
| `src/lib/coaching.ts` | Import from mistake-classifier and mistake-mappings |
| `src/lib/evaluator.ts` | Remove duplicate RANK_VALUE_MAP, import from deck |
| `src/lib/grade-utils.ts` | New — shared `getGradeColor` |
| `src/lib/mistake-mappings.ts` | No change (already canonical) |
| `src/components/ErrorBoundary.tsx` | New — reusable error boundary |
| `src/components/LoadingSpinner.tsx` | New — branded loading spinner |
| `src/components/layout/AppShell.tsx` | Skip nav, `<main>` landmark, focus management, per-route Suspense |
| `src/components/progress/OverviewCards.tsx` | Import getGradeColor |
| `src/components/progress/SessionHistory.tsx` | Import getGradeColor |
| `src/components/analysis/HeroGrade.tsx` | Import getGradeColor |
| `src/pages/ProgressPage.tsx` | Hydration-aware rendering |
| `src/pages/LearnPage.tsx` | First-visit guidance |
| `src/pages/LibraryPage.tsx` | Deleted |
| `src/components/layout/productNav.ts` | Remove Library nav item |
| `src/App.tsx` | Error boundaries, remove /library route, Suspense restructure |

## Acceptance Criteria

- [ ] Multi-way all-in with different stack sizes produces correct pot distribution
- [ ] All-in before flop deals remaining community cards without intermediate renders
- [ ] No circular dependencies (verifiable via import graph)
- [ ] No duplicate utility definitions
- [ ] Runtime errors show fallback UI instead of white screen
- [ ] Burn cards consumed before each community card deal
- [ ] Route transitions show spinner with nav visible
- [ ] ProgressPage shows skeleton during hydration
- [ ] LearnPage shows guidance for new users
- [ ] `/library` route removed, nav shows 5 items
- [ ] Skip navigation link works with keyboard
- [ ] Screen readers announce route changes
- [ ] All existing 308 tests continue to pass
- [ ] New tests for side pot logic, error boundary, and burn cards
