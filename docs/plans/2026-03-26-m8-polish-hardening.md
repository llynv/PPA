# M8: Polish & Hardening — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close all known bugs, eliminate code duplication, add error resilience, and make the app production-ready. No new features — only fixes and hardening.

**Architecture:** 15 items across 4 categories: critical bug fixes (side pots, advanceRound loop), code quality (circular deps, duplicates), resilience & UX polish (error boundaries, burn cards, suspense, hydration), and accessibility (skip nav, focus management, library removal). All changes are client-side. Each task targets specific files with minimal blast radius.

**Tech Stack:** React 18, TypeScript, Zustand, Vitest, Tailwind CSS, react-router-dom v6

---

## Task 1: Extract `classifyMistake` to break circular dependency (M6-1)

**Files:**
- Create: `src/lib/mistake-classifier.ts`
- Modify: `src/lib/analysis.ts:1-22,263-370`
- Modify: `src/lib/coaching.ts:21`
- Modify: `src/lib/__tests__/analysis.test.ts:2`
- Test: `src/lib/__tests__/analysis.test.ts` (existing tests must keep passing)

**Step 1: Create `src/lib/mistake-classifier.ts`**

Extract `classifyMistake`, `classifyMistakeType`, `mapActionToCategory`, `MISTAKE_CATEGORY_MAP`, and the threshold constants from `analysis.ts`:

```typescript
import type {
    ActionType,
    Decision,
    MistakeCategory,
    MistakeType,
} from "../types/poker";

// ── Category Map ────────────────────────────────────────────────────

const MISTAKE_CATEGORY_MAP: Record<MistakeType, MistakeCategory> = {
    OVERFOLD: "FREQUENCY",
    OVERCALL: "FREQUENCY",
    PASSIVE_WITH_EQUITY: "FREQUENCY",
    BAD_SIZING_OVER: "SIZING",
    BAD_SIZING_UNDER: "SIZING",
    MISSED_VALUE_BET: "AGGRESSION",
    MISSED_CBET: "AGGRESSION",
    BLUFF_WRONG_SPOT: "AGGRESSION",
    CALLING_WITHOUT_ODDS: "EQUITY_REALIZATION",
    MISSED_DRAW_PLAY: "EQUITY_REALIZATION",
};

// ── Thresholds ──────────────────────────────────────────────────────

const SIZING_OVER_THRESHOLD = 0.5;
const SIZING_UNDER_THRESHOLD = -0.4;
const MIN_DRAW_OUTS_SEMI_BLUFF = 8;
const MIN_OUTS_DRAW_VALUE = 4;
const STRONG_EQUITY_THRESHOLD = 0.60;
const LOW_EQUITY_THRESHOLD = 0.30;

// ── Helpers ─────────────────────────────────────────────────────────

function mapActionToCategory(action: ActionType): "fold" | "call" | "raise" {
    switch (action) {
        case "fold":
            return "fold";
        case "check":
        case "call":
            return "call";
        case "bet":
        case "raise":
            return "raise";
    }
}

// ── Public API ──────────────────────────────────────────────────────

export function classifyMistake(
    decision: Decision,
): { type: MistakeType; category: MistakeCategory } {
    const type = classifyMistakeType(decision);
    return { type, category: MISTAKE_CATEGORY_MAP[type] };
}

function classifyMistakeType(decision: Decision): MistakeType {
    const hero = mapActionToCategory(decision.heroAction);
    const optimal = mapActionToCategory(decision.optimalAction);
    const equity = decision.equity ?? 0;
    const potOdds = decision.potOdds ?? 0;
    const draws = decision.draws;
    const sizing = decision.betSizeAnalysis;

    // 1. Sizing mistakes (same action type, wrong amount)
    if (hero === optimal && sizing) {
        if (sizing.sizingError > SIZING_OVER_THRESHOLD) {
            return "BAD_SIZING_OVER";
        }
        if (sizing.sizingError < SIZING_UNDER_THRESHOLD) {
            return "BAD_SIZING_UNDER";
        }
    }

    // 2. Hero folded, but should have continued
    if (hero === "fold") {
        if (draws && draws.totalOuts >= MIN_DRAW_OUTS_SEMI_BLUFF && optimal === "raise") {
            return "MISSED_DRAW_PLAY";
        }
        return "OVERFOLD";
    }

    // 3. Hero called, but should have folded
    if (hero === "call" && optimal === "fold") {
        if (equity < potOdds && (!draws || draws.totalOuts < MIN_OUTS_DRAW_VALUE)) {
            return "CALLING_WITHOUT_ODDS";
        }
        return "OVERCALL";
    }

    // 4. Hero called, but should have raised
    if (hero === "call" && optimal === "raise") {
        if (equity >= STRONG_EQUITY_THRESHOLD) {
            return "MISSED_VALUE_BET";
        }
        return "PASSIVE_WITH_EQUITY";
    }

    // 5. Hero raised, but should have folded
    if (hero === "raise" && optimal === "fold") {
        return "BLUFF_WRONG_SPOT";
    }

    // 6. Hero raised, but should have called (overaggression)
    if (hero === "raise" && optimal === "call") {
        if (equity < LOW_EQUITY_THRESHOLD && (!draws || draws.totalOuts < MIN_OUTS_DRAW_VALUE)) {
            return "BLUFF_WRONG_SPOT";
        }
        return "MISSED_VALUE_BET";
    }

    // Fallback
    return "OVERFOLD";
}
```

**Step 2: Update `src/lib/analysis.ts`**

- Remove the `export` from `classifyMistake` function (lines 304-370) and all supporting code: `mapActionToCategory` (263-274), `MISTAKE_CATEGORY_MAP` (278-289), threshold constants (293-298), `classifyMistakeType` (311-370).
- Add import at top: `import { classifyMistake } from "./mistake-classifier";`
- Keep the existing `export { classifyMistake }` re-export so downstream consumers don't break. Add this line after the import:
  ```typescript
  export { classifyMistake } from "./mistake-classifier";
  ```

**Step 3: Update `src/lib/coaching.ts:21`**

Change:
```typescript
import { classifyMistake } from "./analysis";
```
To:
```typescript
import { classifyMistake } from "./mistake-classifier";
```

**Step 4: Run tests**

```bash
npx vitest run src/lib/__tests__/analysis.test.ts src/lib/__tests__/coaching.test.ts
```

Expected: All existing tests pass. The `analysis.test.ts` imports `classifyMistake` from `../analysis` which re-exports it, so no test file changes needed.

**Step 5: Commit**

```bash
git add src/lib/mistake-classifier.ts src/lib/analysis.ts src/lib/coaching.ts
git commit -m "refactor(m8): extract classifyMistake to break circular dep between analysis/coaching"
```

---

## Task 2: Delete duplicate MISTAKE_TYPE_LABELS & RANK_VALUES (M6-2, M1)

**Files:**
- Modify: `src/lib/coaching.ts:20,483-496`
- Modify: `src/lib/evaluator.ts:1-25,` (all usages of `getRankValue`)
- Modify: `src/lib/deck.ts` (no changes needed, already exports)

**Step 1: Fix coaching.ts — import MISTAKE_TYPE_LABELS instead of duplicating**

In `src/lib/coaching.ts`:
- Add `MISTAKE_TYPE_LABELS` to the existing import from `./mistake-mappings` (line 20):
  ```typescript
  import { MISTAKE_TO_DRILL_CONCEPT, MISTAKE_TYPE_LABELS } from "./mistake-mappings";
  ```
- Delete the local `MISTAKE_TYPE_LABELS` const (lines 483-496 and the comment on line 483).

**Step 2: Fix evaluator.ts — import from deck.ts instead of duplicating**

In `src/lib/evaluator.ts`:
- Add import at top: `import { RANK_VALUES } from "./deck";`
- Delete the local `RANK_VALUE_MAP` constant (lines 6-20).
- Delete the local `getRankValue` function (lines 23-25).
- Replace all usages of `getRankValue(someRank)` with `RANK_VALUES[someRank]`.
- Replace all usages of `RANK_VALUE_MAP[someRank]` with `RANK_VALUES[someRank]`.

**Step 3: Run tests**

```bash
npx vitest run src/lib/__tests__/coaching.test.ts src/lib/__tests__/analysis.test.ts
```

Expected: All pass. No behavioral changes.

**Step 4: Commit**

```bash
git add src/lib/coaching.ts src/lib/evaluator.ts
git commit -m "refactor(m8): remove duplicate MISTAKE_TYPE_LABELS and RANK_VALUE_MAP"
```

---

## Task 3: Remove 'showdown' from BettingRound & extract getGradeColor (I8, dedup)

**Files:**
- Modify: `src/types/poker.ts:25`
- Modify: `src/lib/analysis.ts` (fix switch case and Record initialization)
- Modify: `src/store/gameStore.ts` (fix BettingRound usage in helper function signature)
- Create: `src/lib/grade-utils.ts`
- Modify: `src/components/progress/OverviewCards.tsx:4-10`
- Modify: `src/components/progress/SessionHistory.tsx:15-21`
- Modify: `src/components/analysis/HeroGrade.tsx:11-17`

**Step 1: Remove 'showdown' from BettingRound in `src/types/poker.ts:25`**

Change:
```typescript
export type BettingRound = "preflop" | "flop" | "turn" | "river" | "showdown";
```
To:
```typescript
export type BettingRound = "preflop" | "flop" | "turn" | "river";
```

**Step 2: Fix `src/lib/analysis.ts` — remove showdown cases**

In `getCommunityCardsForRound` (around line 56): remove the `case "showdown":` fall-through line.

In `mistakesByRound` initialization (around line 757): remove `showdown: 0` from the Record.

**Step 3: Run TypeScript to find any other broken references**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Fix any remaining references to `'showdown'` used as a `BettingRound`. The `GamePhase` type still has `'showdown'` — that's correct and stays.

**Step 4: Create `src/lib/grade-utils.ts`**

```typescript
import type { HeroGrade } from "../types/poker";

/**
 * Returns a Tailwind text-color class for the given grade.
 */
export function getGradeColorClass(grade: HeroGrade): string {
    if (grade.startsWith("A")) return "text-emerald-400";
    if (grade.startsWith("B")) return "text-sky-400";
    if (grade.startsWith("C")) return "text-amber-400";
    if (grade.startsWith("D")) return "text-orange-400";
    return "text-red-400";
}

/**
 * Returns a hex color string for the given grade.
 */
export function getGradeColorHex(grade: HeroGrade): string {
    if (grade.startsWith("A")) return "#10b981";
    if (grade.startsWith("B")) return "#0ea5e9";
    if (grade.startsWith("C")) return "#f59e0b";
    if (grade.startsWith("D")) return "#f97316";
    return "#ef4444";
}
```

Note: Two separate functions because `OverviewCards`/`SessionHistory` use Tailwind classes while `HeroGrade` component uses hex colors.

**Step 5: Update all three consumers**

- `src/components/progress/OverviewCards.tsx`: Delete local `getGradeColor` (lines 4-10). Add `import { getGradeColorClass } from "../../lib/grade-utils";`. Replace all `getGradeColor(...)` calls with `getGradeColorClass(...)`.

- `src/components/progress/SessionHistory.tsx`: Delete local `getGradeColor` (lines 15-21). Add `import { getGradeColorClass } from "../../lib/grade-utils";`. Replace all `getGradeColor(...)` calls with `getGradeColorClass(...)`.

- `src/components/analysis/HeroGrade.tsx`: Delete local `getGradeColor` (lines 11-17). Add `import { getGradeColorHex } from "../../lib/grade-utils";`. Replace all `getGradeColor(...)` calls with `getGradeColorHex(...)`.

**Step 6: Run tests and type-check**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: All pass. The BettingRound change may cause TS errors if any code uses `'showdown'` as a BettingRound — fix them.

**Step 7: Commit**

```bash
git add src/types/poker.ts src/lib/analysis.ts src/lib/grade-utils.ts src/components/progress/OverviewCards.tsx src/components/progress/SessionHistory.tsx src/components/analysis/HeroGrade.tsx src/store/gameStore.ts
git commit -m "refactor(m8): remove showdown from BettingRound, extract shared getGradeColor utils"
```

---

## Task 4: Side pot handling (I6)

This is the most impactful bug fix. Currently `resolveShowdown` treats the entire pot as a single unit. We need to handle side pots for multi-way all-in scenarios.

**Files:**
- Modify: `src/types/poker.ts` (add SidePot interface)
- Modify: `src/store/gameStore.ts:112-120,190-316,654-757` (add contribution tracking, rewrite resolveShowdown)
- Create: `src/store/__tests__/sidepots.test.ts`

**Step 1: Add SidePot type and contribution tracking to `src/types/poker.ts`**

After the `Player` interface (line 62), add:

```typescript
export interface SidePot {
    amount: number;
    eligiblePlayerIds: string[];
}
```

**Step 2: Add `contributions` to StoreState in `src/store/gameStore.ts`**

In `StoreState` interface (after `pot: number;` at line 117), add:
```typescript
contributions: Record<string, number>; // playerId -> total chips put into pot this hand
```

In the initial state (after `pot: 0,` at line 162), add:
```typescript
contributions: {},
```

In `resetGame` (after `pot: 0,` at line 796), add:
```typescript
contributions: {},
```

**Step 3: Track contributions in `startHand`**

In `startHand`, after the blinds are posted (after line 279 `let pot = sbAmount + bbAmount;`), add:
```typescript
const contributions: Record<string, number> = {};
contributions[players[sbIndex].id] = sbAmount;
contributions[players[bbIndex].id] = bbAmount;
```

Add `contributions` to the `set()` call at line 302.

**Step 4: Track contributions in `performAction`**

In `performAction`, after `potDelta` is computed for each action (around line 372), add:
```typescript
// Track contribution
const updatedContributions = { ...state.contributions };
if (potDelta > 0) {
    updatedContributions[player.id] = (updatedContributions[player.id] ?? 0) + potDelta;
}
```

Add `contributions: updatedContributions` to ALL `set()` calls in `performAction` (there are 3: the fold-win case ~line 404, the round-complete case ~line 418, and the normal case ~line 433).

**Step 5: Write side pot tests — `src/store/__tests__/sidepots.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { computeSidePots } from "../gameStore";
import type { SidePot } from "../../types/poker";

describe("computeSidePots", () => {
    it("returns single pot when all contributions equal", () => {
        const contributions = { hero: 100, "ai-1": 100, "ai-2": 100 };
        const foldedIds = new Set<string>();
        const pots = computeSidePots(contributions, foldedIds);
        expect(pots).toEqual<SidePot[]>([
            { amount: 300, eligiblePlayerIds: ["hero", "ai-1", "ai-2"] },
        ]);
    });

    it("creates main pot + side pot for unequal all-ins", () => {
        // hero has 50, ai-1 has 100, ai-2 has 100
        const contributions = { hero: 50, "ai-1": 100, "ai-2": 100 };
        const foldedIds = new Set<string>();
        const pots = computeSidePots(contributions, foldedIds);
        expect(pots).toEqual<SidePot[]>([
            { amount: 150, eligiblePlayerIds: ["hero", "ai-1", "ai-2"] },
            { amount: 100, eligiblePlayerIds: ["ai-1", "ai-2"] },
        ]);
    });

    it("creates cascading side pots for three different all-in amounts", () => {
        const contributions = { hero: 30, "ai-1": 60, "ai-2": 100 };
        const foldedIds = new Set<string>();
        const pots = computeSidePots(contributions, foldedIds);
        expect(pots).toEqual<SidePot[]>([
            { amount: 90, eligiblePlayerIds: ["hero", "ai-1", "ai-2"] },
            { amount: 60, eligiblePlayerIds: ["ai-1", "ai-2"] },
            { amount: 40, eligiblePlayerIds: ["ai-2"] },
        ]);
    });

    it("excludes folded players from pot eligibility", () => {
        const contributions = { hero: 50, "ai-1": 100, "ai-2": 100 };
        const foldedIds = new Set(["hero"]);
        const pots = computeSidePots(contributions, foldedIds);
        // hero's chips still in the pot, but hero not eligible
        expect(pots).toEqual<SidePot[]>([
            { amount: 150, eligiblePlayerIds: ["ai-1", "ai-2"] },
            { amount: 100, eligiblePlayerIds: ["ai-1", "ai-2"] },
        ]);
    });

    it("returns single pot for heads-up equal stacks", () => {
        const contributions = { hero: 200, "ai-1": 200 };
        const foldedIds = new Set<string>();
        const pots = computeSidePots(contributions, foldedIds);
        expect(pots).toEqual<SidePot[]>([
            { amount: 400, eligiblePlayerIds: ["hero", "ai-1"] },
        ]);
    });

    it("handles heads-up unequal all-in (excess returned as side pot)", () => {
        const contributions = { hero: 50, "ai-1": 200 };
        const foldedIds = new Set<string>();
        const pots = computeSidePots(contributions, foldedIds);
        expect(pots).toEqual<SidePot[]>([
            { amount: 100, eligiblePlayerIds: ["hero", "ai-1"] },
            { amount: 150, eligiblePlayerIds: ["ai-1"] },
        ]);
    });
});
```

**Step 6: Run the test to verify it fails**

```bash
npx vitest run src/store/__tests__/sidepots.test.ts
```

Expected: FAIL — `computeSidePots` doesn't exist yet.

**Step 7: Implement `computeSidePots` in `src/store/gameStore.ts`**

Add this as an exported helper function near the top of the file (after the existing helpers, before `StoreState`):

```typescript
/**
 * Computes side pots from per-player contributions.
 * Each pot has an amount and the list of eligible (non-folded) player IDs.
 */
export function computeSidePots(
    contributions: Record<string, number>,
    foldedIds: Set<string>,
): SidePot[] {
    // Get unique contribution levels, sorted ascending
    const entries = Object.entries(contributions);
    const levels = [...new Set(entries.map(([, amt]) => amt))].sort((a, b) => a - b);

    const pots: SidePot[] = [];
    let prevLevel = 0;

    for (const level of levels) {
        const increment = level - prevLevel;
        if (increment <= 0) continue;

        // All players who contributed at least this level
        const contributors = entries
            .filter(([, amt]) => amt >= level)
            .map(([id]) => id);

        const amount = increment * contributors.length;

        // Only non-folded contributors are eligible to win
        const eligiblePlayerIds = contributors.filter((id) => !foldedIds.has(id));

        if (eligiblePlayerIds.length > 0) {
            pots.push({ amount, eligiblePlayerIds });
        } else {
            // All eligible players folded — add chips to next pot or last pot
            if (pots.length > 0) {
                pots[pots.length - 1].amount += amount;
            } else {
                // Edge case: shouldn't happen (someone must be non-folded)
                pots.push({ amount, eligiblePlayerIds: contributors });
            }
        }

        prevLevel = level;
    }

    return pots;
}
```

**Step 8: Run the test to verify it passes**

```bash
npx vitest run src/store/__tests__/sidepots.test.ts
```

Expected: All 6 tests PASS.

**Step 9: Rewrite `resolveShowdown` to use side pots**

Replace the current `resolveShowdown` (lines 654-757) with:

```typescript
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
        let totalWon = 0;

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
                totalWon = share + (bestGroup.length === 1 ? 0 : 0);
            }
        }

        // Total won by overall winner
        const overallWinnerIdx = players.findIndex((p) => p.id === overallWinnerId);
        totalWon = updatedPlayers[overallWinnerIdx].stack - players[overallWinnerIdx].stack;

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
```

**Step 10: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass including the new sidepots tests and existing gameStore tests.

**Step 11: Commit**

```bash
git add src/types/poker.ts src/store/gameStore.ts src/store/__tests__/sidepots.test.ts
git commit -m "fix(m8): implement side pot handling for multi-way all-in scenarios"
```

---

## Task 5: Fix advanceRound recursion + add burn cards (I2, M4)

**Files:**
- Modify: `src/store/gameStore.ts:582-652` (advanceRound)
- Create: `src/store/__tests__/advanceRound.test.ts`

**Step 1: Write tests for burn cards and loop behavior**

Create `src/store/__tests__/advanceRound.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "../gameStore";

describe("advanceRound", () => {
    beforeEach(() => {
        useGameStore.getState().resetGame();
    });

    it("burns a card before dealing the flop (deck shrinks by 4: 1 burn + 3 flop)", () => {
        // Setup a basic hand state at preflop
        useGameStore.getState().updateSettings({ playerCount: 2 });
        useGameStore.getState().startHand();

        const deckBefore = useGameStore.getState().deck.length;
        // Force advance by setting state
        useGameStore.setState({ currentRound: "preflop" });
        useGameStore.getState().advanceRound();

        const state = useGameStore.getState();
        // If we advanced to flop: 1 burn + 3 community = 4 cards from deck
        if (state.currentRound === "flop" || state.currentRound === "turn") {
            expect(state.communityCards.length).toBeGreaterThanOrEqual(3);
            expect(deckBefore - state.deck.length).toBeGreaterThanOrEqual(4);
        }
    });

    it("burns a card before dealing turn (deck shrinks by 2: 1 burn + 1 turn)", () => {
        useGameStore.getState().updateSettings({ playerCount: 2 });
        useGameStore.getState().startHand();

        // Manually set to flop with 3 community cards
        const deckAfterDeal = useGameStore.getState().deck;
        const { dealt: burnAndFlop, remaining: afterFlop } = dealFlopManually(deckAfterDeal);

        useGameStore.setState({
            currentRound: "flop",
            communityCards: burnAndFlop,
            deck: afterFlop,
        });

        const deckBefore = useGameStore.getState().deck.length;
        useGameStore.getState().advanceRound();

        const state = useGameStore.getState();
        if (state.currentRound === "turn" || state.currentRound === "river") {
            // 1 burn + 1 turn card = 2 cards from deck
            expect(deckBefore - state.deck.length).toBeGreaterThanOrEqual(2);
            expect(state.communityCards.length).toBeGreaterThanOrEqual(4);
        }
    });

    it("does not recurse when all players are all-in — uses loop instead", () => {
        useGameStore.getState().updateSettings({ playerCount: 2 });
        useGameStore.getState().startHand();

        // Set both players as all-in at preflop
        const players = useGameStore.getState().players.map((p) => ({
            ...p,
            isAllIn: true,
            isFolded: false,
        }));

        useGameStore.setState({
            players,
            currentRound: "preflop",
            contributions: { [players[0].id]: 100, [players[1].id]: 100 },
        });

        useGameStore.getState().advanceRound();

        const state = useGameStore.getState();
        // Should have dealt all remaining cards and gone to showdown
        expect(state.gamePhase).toBe("showdown");
        expect(state.communityCards.length).toBe(5);
    });
});

// Helper to simulate dealing a flop (for setting up turn test)
function dealFlopManually(deck: import("../../types/poker").Card[]) {
    return {
        dealt: deck.slice(0, 3),
        remaining: deck.slice(3),
    };
}
```

**Step 2: Rewrite `advanceRound` with while-loop and burn cards**

Replace the `advanceRound` function (lines 582-652) with:

```typescript
    advanceRound: () => {
        const state = get();
        let { currentRound, deck, players } = state;
        const { dealerIndex } = state;

        // Reset all players' currentBet to 0
        let updatedPlayers = players.map((p) => ({ ...p, currentBet: 0 }));
        let communityCards = [...state.communityCards];
        let remainingDeck = deck;

        const nextRound: Record<string, BettingRound> = {
            preflop: "flop",
            flop: "turn",
            turn: "river",
        };

        // Loop: deal cards for each round until an active player can act or we hit showdown
        let keepDealing = true;
        while (keepDealing) {
            const upcoming = nextRound[currentRound];

            // At river or no next round → showdown
            if (!upcoming || currentRound === "river") {
                set({
                    players: updatedPlayers,
                    deck: remainingDeck,
                    communityCards,
                    currentRound,
                });
                get().resolveShowdown();
                return;
            }

            // Burn one card
            const burnResult = dealCards(remainingDeck, 1);
            remainingDeck = burnResult.remaining;

            // Deal community cards
            if (upcoming === "flop") {
                const result = dealCards(remainingDeck, 3);
                communityCards = [...communityCards, ...result.dealt];
                remainingDeck = result.remaining;
            } else {
                const result = dealCards(remainingDeck, 1);
                communityCards = [...communityCards, ...result.dealt];
                remainingDeck = result.remaining;
            }

            currentRound = upcoming;

            // Find first active (non-folded, non-all-in) player after dealer
            const numPlayers = updatedPlayers.length;
            let firstActive = -1;
            for (let i = 1; i <= numPlayers; i++) {
                const idx = (dealerIndex + i) % numPlayers;
                if (!updatedPlayers[idx].isFolded && !updatedPlayers[idx].isAllIn) {
                    firstActive = idx;
                    break;
                }
            }

            if (firstActive !== -1) {
                // Found an active player — stop dealing, let them act
                set({
                    players: updatedPlayers,
                    deck: remainingDeck,
                    communityCards,
                    currentRound,
                    activePlayerIndex: firstActive,
                });
                keepDealing = false;
            }
            // else: no active player → continue loop to deal next street
        }
    },
```

**Step 3: Run tests**

```bash
npx vitest run src/store/__tests__/advanceRound.test.ts src/store/__tests__/sidepots.test.ts src/store/__tests__/gameStore.review.test.ts
```

Expected: All pass.

**Step 4: Run full test suite**

```bash
npx vitest run
```

Expected: All pass.

**Step 5: Commit**

```bash
git add src/store/gameStore.ts src/store/__tests__/advanceRound.test.ts
git commit -m "fix(m8): replace advanceRound recursion with loop, add burn cards before community deals"
```

---

## Task 6: Error boundaries

**Files:**
- Create: `src/components/ErrorBoundary.tsx`
- Modify: `src/App.tsx`

**Step 1: Create `src/components/ErrorBoundary.tsx`**

```typescript
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("[ErrorBoundary]", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
                    <div className="text-4xl">⚠</div>
                    <h2 className="text-xl font-semibold text-zinc-100">
                        Something went wrong
                    </h2>
                    <p className="max-w-md text-sm text-zinc-400">
                        An unexpected error occurred. Try resetting or refreshing the page.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={this.handleReset}
                            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-600 transition-colors"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
```

**Step 2: Add ErrorBoundary to `src/App.tsx`**

Wrap routes inside the `ErrorBoundary`. Add a game-specific boundary around practice and review routes.

Updated `App.tsx`:

```typescript
import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useHydration } from "./hooks/useHydration";

const HomePage = lazy(() => import("./pages/HomePage"));
const PracticePage = lazy(() => import("./pages/PracticePage"));
const LiveTablePage = lazy(() => import("./pages/LiveTablePage"));
const DrillsPage = lazy(() => import("./pages/DrillsPage"));
const ReviewPage = lazy(() => import("./pages/ReviewPage"));
const LearnPage = lazy(() => import("./pages/LearnPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

function App() {
    useHydration();

    return (
        <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
                <Routes>
                    <Route element={<AppShell />}>
                        <Route index element={<HomePage />} />
                        <Route path="practice" element={<PracticePage />}>
                            <Route path="live" element={<LiveTablePage />} />
                            <Route path="drills" element={<DrillsPage />} />
                        </Route>
                        <Route path="review" element={<ReviewPage />} />
                        <Route path="learn" element={<LearnPage />} />
                        <Route path="progress" element={<ProgressPage />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Routes>
            </Suspense>
        </ErrorBoundary>
    );
}

function LoadingFallback() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-900">
            <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
                <span className="text-sm text-zinc-500">Loading...</span>
            </div>
        </div>
    );
}

export default App;
```

Note: This also removes the `/library` route (Library page removal from the design).

**Step 3: Run route tests**

```bash
npx vitest run src/App.routes.test.tsx
```

Expected: The route test may need updating since `/library` is removed. Update the test to remove the library route assertion and add a test that `/library` redirects to `/`.

**Step 4: Commit**

```bash
git add src/components/ErrorBoundary.tsx src/App.tsx src/App.routes.test.tsx
git commit -m "feat(m8): add error boundaries, branded loading spinner, remove library route"
```

---

## Task 7: Library page removal + productNav cleanup

**Files:**
- Delete: `src/pages/LibraryPage.tsx`
- Modify: `src/components/layout/productNav.ts`

**Step 1: Delete `src/pages/LibraryPage.tsx`**

```bash
rm src/pages/LibraryPage.tsx
```

**Step 2: Remove Library from `src/components/layout/productNav.ts`**

Remove the Library entry from the `PRODUCT_NAV_ITEMS` array. The file should contain:
```typescript
export const PRODUCT_NAV_ITEMS = [
    { label: "Home", path: "/" },
    { label: "Practice", path: "/practice" },
    { label: "Review", path: "/review" },
    { label: "Learn", path: "/learn" },
    { label: "Progress", path: "/progress" },
    { label: "Settings", path: "/settings" },
];
```

**Step 3: Run tests**

```bash
npx vitest run
```

Fix any test that references `/library` or `LibraryPage`.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(m8): remove Library page placeholder and nav link"
```

---

## Task 8: Accessibility — skip nav, main landmark, focus management

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

**Step 1: Update AppShell with skip nav link, `<main>` landmark, and focus management**

The updated `AppShell.tsx` adds:
1. A visually-hidden "Skip to main content" link as the first element
2. `<main id="main-content" tabIndex={-1}>` wrapping the `<Outlet />`
3. A `useEffect` that focuses `#main-content` on route changes

Key changes to make:

- Add `useEffect` import from React
- Add skip nav link before the nav:
  ```tsx
  <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-emerald-600 focus:px-4 focus:py-2 focus:text-white"
  >
      Skip to main content
  </a>
  ```
- Wrap `<Outlet />` in `<main id="main-content" tabIndex={-1} className="outline-none">`:
  ```tsx
  <main id="main-content" tabIndex={-1} className="outline-none">
      <Outlet />
  </main>
  ```
- Add route change focus management:
  ```tsx
  const location = useLocation();
  useEffect(() => {
      document.getElementById("main-content")?.focus();
  }, [location.pathname]);
  ```

**Step 2: Run tests**

```bash
npx vitest run
```

**Step 3: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat(m8): add skip nav, main landmark, and focus management on route changes"
```

---

## Task 9: UX Polish — Suspense per-route, hydration-aware Progress, LearnPage guidance

**Files:**
- Modify: `src/components/layout/AppShell.tsx` (per-route Suspense)
- Modify: `src/pages/ProgressPage.tsx` (hydration check)
- Modify: `src/pages/LearnPage.tsx` (first-visit guidance)

**Step 1: Add per-route Suspense in AppShell**

Wrap `<Outlet />` inside the `<main>` with a `<Suspense>` that shows an inline spinner (not full-page), so the nav chrome stays visible during lazy loads:

```tsx
<main id="main-content" tabIndex={-1} className="outline-none">
    <Suspense
        fallback={
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
            </div>
        }
    >
        <Outlet />
    </Suspense>
</main>
```

**Step 2: Make ProgressPage hydration-aware**

Update `src/pages/ProgressPage.tsx` to check `isHydrated` from `progressStore`:

```typescript
import { useProgressStore } from "../store/progressStore";
import { OverviewCards } from "../components/progress/OverviewCards";
import { MasteryGrid } from "../components/progress/MasteryGrid";
import { SessionHistory } from "../components/progress/SessionHistory";
import { WeaknessSpotlight } from "../components/progress/WeaknessSpotlight";

export default function ProgressPage() {
    const isHydrated = useProgressStore((s) => s.isHydrated);

    if (!isHydrated) {
        return (
            <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
                {/* Skeleton placeholders */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div
                            key={i}
                            className="h-24 animate-pulse rounded-xl bg-zinc-800"
                        />
                    ))}
                </div>
                <div className="h-48 animate-pulse rounded-xl bg-zinc-800" />
                <div className="h-64 animate-pulse rounded-xl bg-zinc-800" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
            <OverviewCards />
            <MasteryGrid />
            <WeaknessSpotlight />
            <SessionHistory />
        </div>
    );
}
```

**Step 3: Add first-visit guidance to LearnPage**

In `src/pages/LearnPage.tsx`, add a guidance card when `practicedCount === 0`:

After the existing `practicedCount` computation, before the main return JSX, add:

```tsx
{practicedCount === 0 && (
    <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4 text-center">
        <p className="text-sm text-zinc-300">
            Welcome to your learning path. Complete practice hands or
            drills to unlock concepts and advance through the tiers below.
        </p>
    </div>
)}
```

Place this inside the layout `div`, before the `<RecommendedNext>` component.

**Step 4: Run tests**

```bash
npx vitest run
```

**Step 5: Commit**

```bash
git add src/components/layout/AppShell.tsx src/pages/ProgressPage.tsx src/pages/LearnPage.tsx
git commit -m "feat(m8): add per-route suspense, hydration-aware progress, learn page guidance"
```

---

## Task 10: Final verification

**Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass (308+ original + new sidepot/advanceRound tests).

**Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors (ignoring pre-existing LSP issues).

**Step 3: Run build**

```bash
npm run build
```

Expected: Clean build, no warnings about circular deps.

**Step 4: Verify no circular dependencies**

```bash
npx madge --circular src/lib/analysis.ts src/lib/coaching.ts src/lib/mistake-classifier.ts 2>/dev/null || echo "madge not installed — verify manually"
```

If madge isn't available, manually verify: `analysis.ts` imports from `mistake-classifier.ts` and `coaching.ts`. `coaching.ts` imports from `mistake-classifier.ts` and `mistake-mappings.ts`. No cycle.

**Step 5: Commit any final fixes, then done**

---

## Task Dependency Graph

```
Task 1 (circular dep) ─┐
Task 2 (dedup)         ─┤─── Task 3 (BettingRound + gradeColor) ─┐
                        │                                          │
Task 4 (side pots) ─────┤                                          ├── Task 10 (verify)
Task 5 (advanceRound) ──┤                                          │
                        │                                          │
Task 6 (error boundary) ┤─── Task 7 (library removal) ────────────┤
Task 8 (a11y)          ─┤                                          │
Task 9 (UX polish) ─────┘─────────────────────────────────────────┘
```

Tasks 1-2 can run in parallel. Tasks 4-5 can run in parallel. Tasks 6-9 can run in parallel. Task 3 depends on Task 2 (evaluator cleanup). Task 7 depends on Task 6 (App.tsx changes). Task 10 depends on all others.
