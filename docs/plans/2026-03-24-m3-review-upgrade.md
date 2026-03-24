# M3: Review Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the review page into a coaching experience with categorized mistakes, structured coaching explanations, drill CTAs, session pattern analysis, winner display, and hand history browsing.

**Architecture:** Add `MistakeType` and `MistakeCategory` to the type system. Add classification and coaching generation functions to `analysis.ts`. Add `selectedAnalysisIndex` to `gameStore`. Build 4 new components (SessionPatterns, WinnerBanner, HandHistoryChips, DrillCTA). Modify MistakeCard, HandTimeline, AnalysisDashboard, ReviewPage, and DrillSetup.

**Tech Stack:** React 18, TypeScript, Zustand, Tailwind CSS, React Router v6, Vitest, @testing-library/react

---

### Task 1: Add MistakeType, MistakeCategory, and CoachingExplanation types

**Files:**
- Modify: `src/types/poker.ts:140-156`
- Test: `src/lib/__tests__/analysis.test.ts` (create)

**Step 1: Add new types to poker.ts**

Add `MistakeType`, `MistakeCategory`, and `CoachingExplanation` types, and add new fields to `Mistake` and `Decision`.

In `src/types/poker.ts`, after line 108 (before the `Decision` interface), add:

```typescript
// ── Mistake Classification ──────────────────────────────────────────

export type MistakeType =
  | 'OVERFOLD'
  | 'OVERCALL'
  | 'MISSED_VALUE_BET'
  | 'MISSED_CBET'
  | 'BAD_SIZING_OVER'
  | 'BAD_SIZING_UNDER'
  | 'CALLING_WITHOUT_ODDS'
  | 'BLUFF_WRONG_SPOT'
  | 'MISSED_DRAW_PLAY'
  | 'PASSIVE_WITH_EQUITY';

export type MistakeCategory = 'FREQUENCY' | 'SIZING' | 'AGGRESSION' | 'EQUITY_REALIZATION';

export interface CoachingExplanation {
  whatHappened: string;
  whyMistake: string;
  whatToDo: string;
  concept: MistakeType;
}
```

Modify the `Mistake` interface (currently at line 140) to add `type` and `category`:

```typescript
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
```

Modify the `Decision` interface to add `coaching`:

```typescript
// Add after line 137 (after heroEv field):
coaching?: CoachingExplanation | null;
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean (no errors)

**Step 3: Commit**

```bash
git add src/types/poker.ts
git commit -m "feat(m3): add MistakeType, MistakeCategory, CoachingExplanation types"
```

---

### Task 2: Add mistake classification logic to analysis.ts

**Files:**
- Modify: `src/lib/analysis.ts`
- Create: `src/lib/__tests__/analysis.test.ts`

**Step 1: Write tests for classifyMistake**

Create `src/lib/__tests__/analysis.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { classifyMistake } from '../analysis';
import type { Decision, DecisionContext, ActionType } from '../../types/poker';

// Minimal decision factory for testing
function makeDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    round: 'flop',
    heroAction: 'fold',
    optimalAction: 'call',
    optimalFrequencies: { fold: 0.1, call: 0.6, raise: 0.3 },
    evDiff: 3,
    equity: 0.45,
    potOdds: 0.25,
    spr: 5,
    draws: {
      flushDraw: false, flushDrawOuts: 0, oesD: false, gutshot: false,
      straightDrawOuts: 0, backdoorFlush: false, backdoorStraight: false,
      totalOuts: 0, drawEquity: 0,
    },
    boardTexture: {
      wetness: 'semi-wet', isMonotone: false, isTwoTone: true,
      isRainbow: false, isPaired: false, isTrips: false,
      highCardCount: 1, connectedness: 0.3, possibleStraights: 1,
      possibleFlushes: false,
    },
    ...overrides,
  };
}

describe('classifyMistake', () => {
  it('returns OVERFOLD when hero folded but should have called/raised with equity', () => {
    const decision = makeDecision({
      heroAction: 'fold',
      optimalAction: 'call',
      equity: 0.45,
      potOdds: 0.25,
    });
    const result = classifyMistake(decision);
    expect(result.type).toBe('OVERFOLD');
    expect(result.category).toBe('FREQUENCY');
  });

  it('returns OVERCALL when hero called but should have folded', () => {
    const decision = makeDecision({
      heroAction: 'call',
      optimalAction: 'fold',
      equity: 0.15,
      potOdds: 0.30,
    });
    const result = classifyMistake(decision);
    expect(result.type).toBe('OVERCALL');
    expect(result.category).toBe('FREQUENCY');
  });

  it('returns MISSED_VALUE_BET when hero checked/called but should have raised with high equity', () => {
    const decision = makeDecision({
      heroAction: 'call',
      optimalAction: 'raise',
      equity: 0.70,
    });
    const result = classifyMistake(decision);
    expect(result.type).toBe('MISSED_VALUE_BET');
    expect(result.category).toBe('AGGRESSION');
  });

  it('returns PASSIVE_WITH_EQUITY when hero called with strong equity but raise was optimal', () => {
    const decision = makeDecision({
      heroAction: 'call',
      optimalAction: 'raise',
      equity: 0.58,
    });
    const result = classifyMistake(decision);
    expect(result.type).toBe('PASSIVE_WITH_EQUITY');
    expect(result.category).toBe('FREQUENCY');
  });

  it('returns CALLING_WITHOUT_ODDS when hero called without pot odds and no draws', () => {
    const decision = makeDecision({
      heroAction: 'call',
      optimalAction: 'fold',
      equity: 0.18,
      potOdds: 0.25,
      draws: {
        flushDraw: false, flushDrawOuts: 0, oesD: false, gutshot: false,
        straightDrawOuts: 0, backdoorFlush: false, backdoorStraight: false,
        totalOuts: 0, drawEquity: 0,
      },
    });
    const result = classifyMistake(decision);
    expect(result.type).toBe('CALLING_WITHOUT_ODDS');
    expect(result.category).toBe('EQUITY_REALIZATION');
  });

  it('returns MISSED_DRAW_PLAY when hero folded with a draw and raise was optimal', () => {
    const decision = makeDecision({
      heroAction: 'fold',
      optimalAction: 'raise',
      equity: 0.35,
      draws: {
        flushDraw: true, flushDrawOuts: 9, oesD: false, gutshot: false,
        straightDrawOuts: 0, backdoorFlush: false, backdoorStraight: false,
        totalOuts: 9, drawEquity: 0.19,
      },
    });
    const result = classifyMistake(decision);
    expect(result.type).toBe('MISSED_DRAW_PLAY');
    expect(result.category).toBe('EQUITY_REALIZATION');
  });

  it('returns BAD_SIZING_OVER when hero bet too large', () => {
    const decision = makeDecision({
      heroAction: 'raise',
      optimalAction: 'raise',
      betSizeAnalysis: { heroSize: 100, optimalSize: 50, sizingError: 1.0 },
    });
    const result = classifyMistake(decision);
    expect(result.type).toBe('BAD_SIZING_OVER');
    expect(result.category).toBe('SIZING');
  });

  it('returns BAD_SIZING_UNDER when hero bet too small', () => {
    const decision = makeDecision({
      heroAction: 'bet',
      optimalAction: 'bet',
      betSizeAnalysis: { heroSize: 20, optimalSize: 50, sizingError: -0.6 },
    });
    const result = classifyMistake(decision);
    expect(result.type).toBe('BAD_SIZING_UNDER');
    expect(result.category).toBe('SIZING');
  });

  it('returns BLUFF_WRONG_SPOT when hero raised with low equity on dry board with no draws', () => {
    const decision = makeDecision({
      heroAction: 'raise',
      optimalAction: 'fold',
      equity: 0.15,
      draws: {
        flushDraw: false, flushDrawOuts: 0, oesD: false, gutshot: false,
        straightDrawOuts: 0, backdoorFlush: false, backdoorStraight: false,
        totalOuts: 0, drawEquity: 0,
      },
      boardTexture: {
        wetness: 'dry', isMonotone: false, isTwoTone: false,
        isRainbow: true, isPaired: false, isTrips: false,
        highCardCount: 1, connectedness: 0.1, possibleStraights: 0,
        possibleFlushes: false,
      },
    });
    const result = classifyMistake(decision);
    expect(result.type).toBe('BLUFF_WRONG_SPOT');
    expect(result.category).toBe('AGGRESSION');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/analysis.test.ts`
Expected: FAIL — `classifyMistake` is not exported

**Step 3: Implement classifyMistake in analysis.ts**

Add to `src/lib/analysis.ts` after the `mapActionToCategory` function (around line 264):

```typescript
import type {
    // ... existing imports, add:
    MistakeType,
    MistakeCategory,
} from "../types/poker";

// ── Mistake Classification ──────────────────────────────────────────

const MISTAKE_CATEGORY_MAP: Record<MistakeType, MistakeCategory> = {
  OVERFOLD: 'FREQUENCY',
  OVERCALL: 'FREQUENCY',
  PASSIVE_WITH_EQUITY: 'FREQUENCY',
  BAD_SIZING_OVER: 'SIZING',
  BAD_SIZING_UNDER: 'SIZING',
  MISSED_VALUE_BET: 'AGGRESSION',
  MISSED_CBET: 'AGGRESSION',
  BLUFF_WRONG_SPOT: 'AGGRESSION',
  CALLING_WITHOUT_ODDS: 'EQUITY_REALIZATION',
  MISSED_DRAW_PLAY: 'EQUITY_REALIZATION',
};

export function classifyMistake(
  decision: Decision,
): { type: MistakeType; category: MistakeCategory } {
  const hero = mapActionToCategory(decision.heroAction);
  const optimal = mapActionToCategory(decision.optimalAction);
  const equity = decision.equity ?? 0;
  const potOdds = decision.potOdds ?? 0;
  const draws = decision.draws;
  const boardTexture = decision.boardTexture;
  const sizing = decision.betSizeAnalysis;

  // 1. Sizing mistakes (same action type, wrong amount)
  if (hero === optimal && sizing) {
    if (sizing.sizingError > 0.5) {
      return { type: 'BAD_SIZING_OVER', category: MISTAKE_CATEGORY_MAP.BAD_SIZING_OVER };
    }
    if (sizing.sizingError < -0.4) {
      return { type: 'BAD_SIZING_UNDER', category: MISTAKE_CATEGORY_MAP.BAD_SIZING_UNDER };
    }
  }

  // 2. Hero folded, but should have continued
  if (hero === 'fold') {
    // Check for missed draw play first
    if (draws && draws.totalOuts >= 8 && optimal === 'raise') {
      return { type: 'MISSED_DRAW_PLAY', category: MISTAKE_CATEGORY_MAP.MISSED_DRAW_PLAY };
    }
    return { type: 'OVERFOLD', category: MISTAKE_CATEGORY_MAP.OVERFOLD };
  }

  // 3. Hero called, but should have folded
  if (hero === 'call' && optimal === 'fold') {
    // More specific: calling without odds
    if (equity < potOdds && (!draws || draws.totalOuts < 4)) {
      return { type: 'CALLING_WITHOUT_ODDS', category: MISTAKE_CATEGORY_MAP.CALLING_WITHOUT_ODDS };
    }
    return { type: 'OVERCALL', category: MISTAKE_CATEGORY_MAP.OVERCALL };
  }

  // 4. Hero called, but should have raised
  if (hero === 'call' && optimal === 'raise') {
    if (equity >= 0.60) {
      return { type: 'MISSED_VALUE_BET', category: MISTAKE_CATEGORY_MAP.MISSED_VALUE_BET };
    }
    return { type: 'PASSIVE_WITH_EQUITY', category: MISTAKE_CATEGORY_MAP.PASSIVE_WITH_EQUITY };
  }

  // 5. Hero raised, but should have folded
  if (hero === 'raise' && optimal === 'fold') {
    if (equity < 0.30 && (!draws || draws.totalOuts < 4) &&
        boardTexture && (boardTexture.wetness === 'dry' || boardTexture.wetness === 'semi-wet')) {
      return { type: 'BLUFF_WRONG_SPOT', category: MISTAKE_CATEGORY_MAP.BLUFF_WRONG_SPOT };
    }
    return { type: 'BLUFF_WRONG_SPOT', category: MISTAKE_CATEGORY_MAP.BLUFF_WRONG_SPOT };
  }

  // 6. Hero raised, but should have called (overaggression)
  if (hero === 'raise' && optimal === 'call') {
    if (equity < 0.30 && (!draws || draws.totalOuts < 4)) {
      return { type: 'BLUFF_WRONG_SPOT', category: MISTAKE_CATEGORY_MAP.BLUFF_WRONG_SPOT };
    }
    return { type: 'MISSED_VALUE_BET', category: MISTAKE_CATEGORY_MAP.MISSED_VALUE_BET };
  }

  // Fallback
  return { type: 'OVERFOLD', category: MISTAKE_CATEGORY_MAP.OVERFOLD };
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/analysis.test.ts`
Expected: All 8 tests PASS

**Step 5: Commit**

```bash
git add src/lib/analysis.ts src/lib/__tests__/analysis.test.ts
git commit -m "feat(m3): add classifyMistake with deterministic mistake type classification"
```

---

### Task 3: Add coaching explanation generator and integrate into analyzeHand

**Files:**
- Modify: `src/lib/analysis.ts`
- Modify: `src/lib/__tests__/analysis.test.ts`

**Step 1: Write tests for generateCoaching**

Append to `src/lib/__tests__/analysis.test.ts`:

```typescript
import { generateCoaching } from '../analysis';

describe('generateCoaching', () => {
  it('generates structured coaching for OVERFOLD', () => {
    const decision = makeDecision({
      heroAction: 'fold',
      optimalAction: 'call',
      equity: 0.45,
      potOdds: 0.25,
      round: 'flop',
    });
    const coaching = generateCoaching(decision, 'OVERFOLD');
    expect(coaching.whatHappened).toBeTruthy();
    expect(coaching.whyMistake).toBeTruthy();
    expect(coaching.whatToDo).toBeTruthy();
    expect(coaching.concept).toBe('OVERFOLD');
    expect(coaching.whatHappened).toContain('fold');
    expect(coaching.whyMistake).toContain('equity');
  });

  it('generates structured coaching for MISSED_VALUE_BET', () => {
    const decision = makeDecision({
      heroAction: 'call',
      optimalAction: 'raise',
      equity: 0.72,
      round: 'river',
    });
    const coaching = generateCoaching(decision, 'MISSED_VALUE_BET');
    expect(coaching.concept).toBe('MISSED_VALUE_BET');
    expect(coaching.whatToDo).toContain('raise');
  });

  it('generates coaching for BAD_SIZING_OVER with sizing details', () => {
    const decision = makeDecision({
      heroAction: 'raise',
      optimalAction: 'raise',
      betSizeAnalysis: { heroSize: 100, optimalSize: 50, sizingError: 1.0 },
    });
    const coaching = generateCoaching(decision, 'BAD_SIZING_OVER');
    expect(coaching.concept).toBe('BAD_SIZING_OVER');
    expect(coaching.whyMistake).toBeTruthy();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/analysis.test.ts`
Expected: FAIL — `generateCoaching` not exported

**Step 3: Implement generateCoaching in analysis.ts**

Add after `classifyMistake`:

```typescript
import type {
    // ... add to existing imports:
    CoachingExplanation,
} from "../types/poker";

export function generateCoaching(
  decision: Decision,
  mistakeType: MistakeType,
): CoachingExplanation {
  const heroLabel = formatActionLabel(decision.heroAction, decision.heroAmount, decision.heroIsAllIn);
  const optimalLabel = formatActionLabel(decision.optimalAction, decision.optimalAmount);
  const equityPct = decision.equity != null ? `${Math.round(decision.equity * 100)}%` : 'unknown';
  const potOddsPct = decision.potOdds != null ? `${Math.round(decision.potOdds * 100)}%` : null;
  const round = decision.round;

  const whatHappened = `You chose to ${heroLabel.toLowerCase()} on the ${round}.`;

  let whyMistake: string;
  let whatToDo: string;

  switch (mistakeType) {
    case 'OVERFOLD':
      whyMistake = potOddsPct
        ? `With ${equityPct} equity and ${potOddsPct} pot odds, you had more than enough equity to continue. Folding here gives up profitable situations.`
        : `With ${equityPct} equity, folding surrenders expected value. The optimal play was to ${optimalLabel.toLowerCase()}.`;
      whatToDo = `In this spot, ${optimalLabel.toLowerCase()} is +EV. Consider your equity relative to pot odds before folding — if your equity exceeds the pot odds, continuing is profitable.`;
      break;
    case 'OVERCALL':
      whyMistake = potOddsPct
        ? `With only ${equityPct} equity facing ${potOddsPct} pot odds, you don't have enough equity to call profitably.`
        : `With ${equityPct} equity, calling here is -EV. The pot isn't offering enough to justify continuing.`;
      whatToDo = `Fold when your equity is below the pot odds and you don't have enough implied odds or draws to compensate.`;
      break;
    case 'MISSED_VALUE_BET':
      whyMistake = `With ${equityPct} equity, your hand is strong enough to raise for value. By just calling, you miss extracting chips from weaker hands that would pay off a raise.`;
      whatToDo = `Raise for value when you have strong equity. Opponents with medium-strength hands will often call, adding to your expected value.`;
      break;
    case 'MISSED_CBET':
      whyMistake = `As the preflop aggressor, checking forfeits your range advantage. A continuation bet applies pressure and often takes down the pot immediately.`;
      whatToDo = `Fire a c-bet on favorable board textures when you have the initiative. Even without a strong hand, your preflop raising range gives you credibility.`;
      break;
    case 'BAD_SIZING_OVER':
      whyMistake = decision.betSizeAnalysis
        ? `Your bet of ${decision.betSizeAnalysis.heroSize.toFixed(0)} was ${Math.round(decision.betSizeAnalysis.sizingError * 100)}% larger than optimal (${decision.betSizeAnalysis.optimalSize.toFixed(0)}). Oversizing risks too much when called and folds out hands you want action from.`
        : `Your bet was significantly larger than the optimal sizing. Oversizing polarizes your range unnecessarily.`;
      whatToDo = `Size your bets relative to the pot and board texture. On drier boards, smaller bets work well; on wetter boards, size up to deny equity.`;
      break;
    case 'BAD_SIZING_UNDER':
      whyMistake = decision.betSizeAnalysis
        ? `Your bet of ${decision.betSizeAnalysis.heroSize.toFixed(0)} was ${Math.abs(Math.round(decision.betSizeAnalysis.sizingError * 100))}% smaller than optimal (${decision.betSizeAnalysis.optimalSize.toFixed(0)}). Undersizing gives opponents a cheap price to draw out.`
        : `Your bet was significantly smaller than optimal. Small bets give opponents too good a price to continue.`;
      whatToDo = `Size up when the board is wet or when you're value betting. Giving opponents incorrect odds to call is how you maximize EV.`;
      break;
    case 'CALLING_WITHOUT_ODDS':
      whyMistake = potOddsPct
        ? `With ${equityPct} equity and ${potOddsPct} pot odds, you're calling without the math on your side. Without significant draws, this is a losing play.`
        : `With ${equityPct} equity and no meaningful draws, calling here bleeds chips over time.`;
      whatToDo = `Only call when your equity (including draw outs and implied odds) exceeds the pot odds. When the math doesn't work, fold and save chips for better spots.`;
      break;
    case 'BLUFF_WRONG_SPOT':
      whyMistake = `With only ${equityPct} equity and no draws on a ${decision.boardTexture?.wetness ?? ''} board, raising here has very little fold equity and almost no backup plan if called.`;
      whatToDo = `Pick better bluffing spots: boards that favor your perceived range, positions with more fold equity, or situations where you have backdoor draws as backup.`;
      break;
    case 'MISSED_DRAW_PLAY':
      whyMistake = decision.draws
        ? `You have ${decision.draws.totalOuts} outs (${(decision.draws.drawEquity * 100).toFixed(0)}% draw equity). With a strong draw, playing aggressively builds the pot for when you hit and can win the pot immediately through fold equity.`
        : `With a strong drawing hand, playing passively misses the opportunity to semi-bluff and build fold equity.`;
      whatToDo = `With 8+ outs, consider semi-bluffing. Raising with a draw puts pressure on opponents and gives you two ways to win: they fold, or you hit your draw.`;
      break;
    case 'PASSIVE_WITH_EQUITY':
      whyMistake = `With ${equityPct} equity, just calling is too passive. You have a strong enough hand to raise, which builds the pot and pressures opponents with weaker holdings.`;
      whatToDo = `When you have 55%+ equity, lean toward raising. Passive play with strong hands lets opponents see cheap cards and outdraw you.`;
      break;
  }

  return { whatHappened, whyMistake, whatToDo, concept: mistakeType };
}

function formatActionLabel(action: ActionType, amount?: number, isAllIn?: boolean): string {
  if (isAllIn && (action === 'bet' || action === 'raise' || action === 'call')) {
    return amount != null && amount > 0 ? `All-in $${amount}` : 'All-in';
  }
  const label = action.charAt(0).toUpperCase() + action.slice(1);
  if (amount != null && amount > 0) return `${label} $${amount}`;
  return label;
}
```

**Step 4: Integrate classifyMistake and generateCoaching into analyzeHand**

In the `analyzeHand` function, modify the mistake generation block (around lines 503-518) and the decision construction (around line 481):

The decision construction should add `coaching: null` by default. Then in the mistake block:

```typescript
// Replace the existing mistake block (lines 503-518) with:
const heroFrequency = result.frequencies[heroCategory];
if (evDiff > 0 && heroFrequency < 0.2) {
    const { type: mistakeType, category: mistakeCategory } = classifyMistake(decision);
    const coaching = generateCoaching(decision, mistakeType);
    
    // Attach coaching to the decision
    decision.coaching = coaching;
    
    const description = result.reasoning;

    mistakes.push({
        round,
        description,
        severity: determineSeverity(evDiff),
        evLoss: evDiff,
        heroAction: heroAction.type,
        optimalAction: result.optimalAction,
        type: mistakeType,
        category: mistakeCategory,
    });
}
```

**Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (existing 177 + new analysis tests)

**Step 6: Commit**

```bash
git add src/lib/analysis.ts src/lib/__tests__/analysis.test.ts
git commit -m "feat(m3): add coaching explanations and integrate mistake classification into analyzeHand"
```

---

### Task 4: Add selectedAnalysisIndex to gameStore + hand history browsing

**Files:**
- Modify: `src/store/gameStore.ts`
- Modify: `src/store/__tests__/drillStore.test.ts` (reference only)
- Create: `src/store/__tests__/gameStore.review.test.ts`

**Step 1: Write tests for selectedAnalysisIndex**

Create `src/store/__tests__/gameStore.review.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../gameStore';
import type { AnalysisData } from '../../types/poker';

function makeAnalysis(handNumber: number): AnalysisData {
  return {
    heroGrade: 'A',
    decisions: [],
    totalEvLoss: 1.5,
    totalHeroEv: 3.0,
    mistakes: [],
    handNumber,
  };
}

describe('gameStore review browsing', () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it('selectedAnalysisIndex defaults to -1 (latest)', () => {
    expect(useGameStore.getState().selectedAnalysisIndex).toBe(-1);
  });

  it('selectAnalysis sets the index', () => {
    useGameStore.getState().selectAnalysis(2);
    expect(useGameStore.getState().selectedAnalysisIndex).toBe(2);
  });

  it('resetGame resets selectedAnalysisIndex to -1', () => {
    useGameStore.getState().selectAnalysis(5);
    useGameStore.getState().resetGame();
    expect(useGameStore.getState().selectedAnalysisIndex).toBe(-1);
  });

  it('getActiveAnalysis returns the selected analysis from sessionAnalyses', () => {
    const a1 = makeAnalysis(1);
    const a2 = makeAnalysis(2);
    const a3 = makeAnalysis(3);
    useGameStore.setState({
      sessionAnalyses: [a1, a2, a3],
      analysisData: a3,
      selectedAnalysisIndex: 1,
    });
    expect(useGameStore.getState().getActiveAnalysis()).toBe(a2);
  });

  it('getActiveAnalysis returns latest (analysisData) when index is -1', () => {
    const a1 = makeAnalysis(1);
    const a2 = makeAnalysis(2);
    useGameStore.setState({
      sessionAnalyses: [a1, a2],
      analysisData: a2,
      selectedAnalysisIndex: -1,
    });
    expect(useGameStore.getState().getActiveAnalysis()).toBe(a2);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/__tests__/gameStore.review.test.ts`
Expected: FAIL — `selectedAnalysisIndex`, `selectAnalysis`, `getActiveAnalysis` don't exist

**Step 3: Add selectedAnalysisIndex, selectAnalysis, getActiveAnalysis to gameStore**

In `src/store/gameStore.ts`:

Add to `StoreState` interface (around line 129):
```typescript
selectedAnalysisIndex: number;  // -1 = latest
```

Add to actions (around line 145):
```typescript
selectAnalysis: (index: number) => void;
getActiveAnalysis: () => AnalysisData | null;
```

Add to initial state (after `sessionAnalyses: []`):
```typescript
selectedAnalysisIndex: -1,
```

Add action implementations (before `resetGame`):
```typescript
selectAnalysis: (index: number) => set({ selectedAnalysisIndex: index }),

getActiveAnalysis: () => {
    const state = get();
    if (state.selectedAnalysisIndex === -1) {
        return state.analysisData;
    }
    return state.sessionAnalyses[state.selectedAnalysisIndex] ?? state.analysisData;
},
```

In `resetGame`, add `selectedAnalysisIndex: -1`.

**Step 4: Run tests**

Run: `npx vitest run src/store/__tests__/gameStore.review.test.ts`
Expected: All 5 tests PASS

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/store/gameStore.ts src/store/__tests__/gameStore.review.test.ts
git commit -m "feat(m3): add selectedAnalysisIndex and hand history browsing to gameStore"
```

---

### Task 5: Build HandHistoryChips component

**Files:**
- Create: `src/components/analysis/HandHistoryChips.tsx`

**Step 1: Build the component**

Create `src/components/analysis/HandHistoryChips.tsx`:

```typescript
import { useGameStore } from '../../store/gameStore';

const GRADE_COLORS: Record<string, string> = {
  'A+': 'text-emerald-400', A: 'text-emerald-400', 'A-': 'text-emerald-400',
  'B+': 'text-sky-400', B: 'text-sky-400', 'B-': 'text-sky-400',
  'C+': 'text-amber-400', C: 'text-amber-400', 'C-': 'text-amber-400',
  D: 'text-orange-400', F: 'text-red-400',
};

export function HandHistoryChips() {
  const sessionAnalyses = useGameStore((s) => s.sessionAnalyses);
  const selectedIndex = useGameStore((s) => s.selectedAnalysisIndex);
  const selectAnalysis = useGameStore((s) => s.selectAnalysis);

  if (sessionAnalyses.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {sessionAnalyses.map((analysis, i) => {
        const isActive = selectedIndex === i || (selectedIndex === -1 && i === sessionAnalyses.length - 1);
        const gradeColor = GRADE_COLORS[analysis.heroGrade] ?? 'text-slate-400';

        return (
          <button
            key={analysis.handNumber}
            onClick={() => selectAnalysis(i)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
              ${isActive
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
              }`}
          >
            <span>Hand {analysis.handNumber}</span>
            <span className={`ml-1.5 ${isActive ? 'text-white' : gradeColor}`}>
              {analysis.heroGrade}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 3: Commit**

```bash
git add src/components/analysis/HandHistoryChips.tsx
git commit -m "feat(m3): add HandHistoryChips component for session hand browsing"
```

---

### Task 6: Build WinnerBanner and DrillCTA components

**Files:**
- Create: `src/components/analysis/WinnerBanner.tsx`
- Create: `src/components/analysis/DrillCTA.tsx`

**Step 1: Build WinnerBanner**

Create `src/components/analysis/WinnerBanner.tsx`:

```typescript
import { useGameStore } from '../../store/gameStore';

interface WinnerBannerProps {
  handNumber: number;
}

export function WinnerBanner({ handNumber }: WinnerBannerProps) {
  const handHistory = useGameStore((s) => s.handHistory);
  const players = useGameStore((s) => s.players);

  const hand = handHistory.find((h) => h.handNumber === handNumber);
  if (!hand) return null;

  const winnerPlayer = hand.players.find((p) => p.id === hand.winnerId);
  if (!winnerPlayer) return null;

  const isHeroWin = winnerPlayer.isHero;
  const winnerName = winnerPlayer.isHero ? 'You' : winnerPlayer.name;
  const handDesc = hand.winnerHand ?? 'unknown hand';

  return (
    <div
      className={`text-center text-sm font-medium rounded-lg px-3 py-2 ${
        isHeroWin
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-slate-700/50 text-slate-400 border border-slate-700'
      }`}
    >
      {isHeroWin
        ? `You won with ${handDesc}`
        : `${winnerName} won with ${handDesc}`}
    </div>
  );
}
```

**Step 2: Build DrillCTA**

Create `src/components/analysis/DrillCTA.tsx`:

```typescript
import { useNavigate } from 'react-router-dom';
import type { MistakeType } from '../../types/poker';
import type { DrillConcept } from '../../types/drill';

/** Maps MistakeType → the most relevant DrillConcept to practice */
const MISTAKE_TO_DRILL: Record<MistakeType, DrillConcept> = {
  OVERFOLD: 'cold_call',
  OVERCALL: 'bluff_catch',
  MISSED_VALUE_BET: 'value_bet_thin',
  MISSED_CBET: 'cbet_value',
  BAD_SIZING_OVER: 'cbet_value',
  BAD_SIZING_UNDER: 'cbet_value',
  CALLING_WITHOUT_ODDS: 'bluff_catch',
  BLUFF_WRONG_SPOT: 'river_bluff',
  MISSED_DRAW_PLAY: 'semi_bluff',
  PASSIVE_WITH_EQUITY: 'value_bet_thin',
};

const MISTAKE_LABELS: Record<MistakeType, string> = {
  OVERFOLD: 'Folding too often',
  OVERCALL: 'Calling too wide',
  MISSED_VALUE_BET: 'Missing value bets',
  MISSED_CBET: 'Missing c-bets',
  BAD_SIZING_OVER: 'Bet sizing (too large)',
  BAD_SIZING_UNDER: 'Bet sizing (too small)',
  CALLING_WITHOUT_ODDS: 'Calling without odds',
  BLUFF_WRONG_SPOT: 'Bluffing in bad spots',
  MISSED_DRAW_PLAY: 'Playing draws passively',
  PASSIVE_WITH_EQUITY: 'Playing too passively',
};

interface DrillCTAProps {
  mistakeType: MistakeType;
}

export function DrillCTA({ mistakeType }: DrillCTAProps) {
  const navigate = useNavigate();
  const concept = MISTAKE_TO_DRILL[mistakeType];

  const handleClick = () => {
    navigate(`/practice/drills?concept=${concept}`);
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 text-xs font-medium hover:bg-emerald-600/30 transition-colors"
    >
      <span>Practice: {MISTAKE_LABELS[mistakeType]}</span>
      <span aria-hidden="true">&rarr;</span>
    </button>
  );
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 4: Commit**

```bash
git add src/components/analysis/WinnerBanner.tsx src/components/analysis/DrillCTA.tsx
git commit -m "feat(m3): add WinnerBanner and DrillCTA components"
```

---

### Task 7: Update MistakeCard with coaching explanations and DrillCTA

**Files:**
- Modify: `src/components/analysis/MistakeCard.tsx`

**Step 1: Update MistakeCard to render coaching sections and DrillCTA**

Modify `src/components/analysis/MistakeCard.tsx`:

1. Import `DrillCTA` and the new types:
```typescript
import type { Mistake, Decision, CoachingExplanation } from "../../types/poker";
import { DrillCTA } from "./DrillCTA";
```

2. Replace the expanded content section (everything inside `{expanded && (` ... `)}`) with a new layout that uses coaching if available:

In the expanded section, replace the single narrative `<p>` (around line 137) with:

```typescript
{/* 1. Coaching explanation (structured) or fallback narrative */}
{decision?.coaching ? (
  <div className="space-y-3">
    {/* What happened — neutral */}
    <div>
      <p className="text-slate-500 text-xs font-medium mb-0.5">What happened</p>
      <p className="text-slate-300 text-sm leading-relaxed">{decision.coaching.whatHappened}</p>
    </div>
    {/* Why it's a mistake — amber */}
    <div>
      <p className="text-amber-500 text-xs font-medium mb-0.5">Why it&apos;s a mistake</p>
      <p className="text-slate-200 text-sm leading-relaxed">{decision.coaching.whyMistake}</p>
    </div>
    {/* What to do instead — green */}
    <div>
      <p className="text-emerald-500 text-xs font-medium mb-0.5">What to do instead</p>
      <p className="text-slate-200 text-sm leading-relaxed">{decision.coaching.whatToDo}</p>
    </div>
  </div>
) : (
  <p className="text-slate-200 text-sm leading-relaxed">{narrative}</p>
)}
```

3. After the EV-by-action breakdown grid (section 7, around line 301), add the DrillCTA:

```typescript
{/* 8. Drill CTA */}
{mistake.type && <DrillCTA mistakeType={mistake.type} />}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 3: Run full tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/components/analysis/MistakeCard.tsx
git commit -m "feat(m3): update MistakeCard with coaching explanations and drill CTA"
```

---

### Task 8: Update HandTimeline with coaching explanations

**Files:**
- Modify: `src/components/analysis/HandTimeline.tsx`

**Step 1: Update StreetSection to show coaching for mistakes**

In `HandTimeline.tsx`, modify the explanation rendering in the `StreetSection` component.

Replace the single explanation paragraph (around line 241) with conditional coaching rendering:

```typescript
{/* Natural language explanation or coaching */}
{decision.coaching ? (
  <div className="space-y-1.5 text-xs">
    <p className="text-slate-300 leading-relaxed">{decision.coaching.whatHappened}</p>
    <p className="text-amber-400/80 leading-relaxed">{decision.coaching.whyMistake}</p>
    <p className="text-emerald-400/80 leading-relaxed">{decision.coaching.whatToDo}</p>
  </div>
) : (
  <p className="text-slate-300 text-xs leading-relaxed">{explanation}</p>
)}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 3: Commit**

```bash
git add src/components/analysis/HandTimeline.tsx
git commit -m "feat(m3): update HandTimeline with coaching explanations"
```

---

### Task 9: Build SessionPatterns component

**Files:**
- Create: `src/components/analysis/SessionPatterns.tsx`
- Modify: `src/lib/analysis.ts` — extend `getSessionStats` with mistake type breakdowns

**Step 1: Extend SessionStats type and getSessionStats function**

In `src/lib/analysis.ts`, update the `SessionStats` interface:

```typescript
export interface SessionStats {
    totalHands: number;
    averageGrade: HeroGrade;
    totalEvLoss: number;
    averageEvLossPerHand: number;
    biggestMistake: Mistake | null;
    mistakesByRound: Record<BettingRound, number>;
    mistakesByType: Record<string, { count: number; totalEvLoss: number }>;
    mistakesByCategory: Record<string, { count: number; totalEvLoss: number }>;
    weakestType: { type: string; count: number; totalEvLoss: number } | null;
}
```

Add to `getSessionStats` function, before the return statement:

```typescript
// Count mistakes by type and category
const mistakesByType: Record<string, { count: number; totalEvLoss: number }> = {};
const mistakesByCategory: Record<string, { count: number; totalEvLoss: number }> = {};

for (const mistake of allMistakes) {
    if (mistake.type) {
        if (!mistakesByType[mistake.type]) {
            mistakesByType[mistake.type] = { count: 0, totalEvLoss: 0 };
        }
        mistakesByType[mistake.type].count++;
        mistakesByType[mistake.type].totalEvLoss += mistake.evLoss;
    }
    if (mistake.category) {
        if (!mistakesByCategory[mistake.category]) {
            mistakesByCategory[mistake.category] = { count: 0, totalEvLoss: 0 };
        }
        mistakesByCategory[mistake.category].count++;
        mistakesByCategory[mistake.category].totalEvLoss += mistake.evLoss;
    }
}

// Find weakest type
const typeEntries = Object.entries(mistakesByType);
const weakestType = typeEntries.length > 0
    ? typeEntries.reduce((worst, [type, data]) =>
        data.totalEvLoss > worst.totalEvLoss
            ? { type, ...data }
            : worst,
        { type: typeEntries[0][0], ...typeEntries[0][1] },
    )
    : null;
```

And add to the return:

```typescript
return {
    totalHands,
    averageGrade,
    totalEvLoss: Math.round(totalEvLoss * 100) / 100,
    averageEvLossPerHand: Math.round(averageEvLossPerHand * 100) / 100,
    biggestMistake,
    mistakesByRound,
    mistakesByType,
    mistakesByCategory,
    weakestType,
};
```

**Step 2: Build SessionPatterns component**

Create `src/components/analysis/SessionPatterns.tsx`:

```typescript
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { getSessionStats } from '../../lib/analysis';
import type { MistakeType } from '../../types/poker';

const CATEGORY_LABELS: Record<string, string> = {
  FREQUENCY: 'Frequency mistakes',
  SIZING: 'Sizing mistakes',
  AGGRESSION: 'Aggression mistakes',
  EQUITY_REALIZATION: 'Equity realization',
};

const TYPE_LABELS: Record<string, string> = {
  OVERFOLD: 'Overfolding',
  OVERCALL: 'Overcalling',
  MISSED_VALUE_BET: 'Missed value bets',
  MISSED_CBET: 'Missed c-bets',
  BAD_SIZING_OVER: 'Oversized bets',
  BAD_SIZING_UNDER: 'Undersized bets',
  CALLING_WITHOUT_ODDS: 'Calling without odds',
  BLUFF_WRONG_SPOT: 'Bad bluff spots',
  MISSED_DRAW_PLAY: 'Passive draw play',
  PASSIVE_WITH_EQUITY: 'Too passive with equity',
};

const MISTAKE_TO_CONCEPT: Record<string, string> = {
  OVERFOLD: 'cold_call',
  OVERCALL: 'bluff_catch',
  MISSED_VALUE_BET: 'value_bet_thin',
  MISSED_CBET: 'cbet_value',
  BAD_SIZING_OVER: 'cbet_value',
  BAD_SIZING_UNDER: 'cbet_value',
  CALLING_WITHOUT_ODDS: 'bluff_catch',
  BLUFF_WRONG_SPOT: 'river_bluff',
  MISSED_DRAW_PLAY: 'semi_bluff',
  PASSIVE_WITH_EQUITY: 'value_bet_thin',
};

export function SessionPatterns() {
  const navigate = useNavigate();
  const sessionAnalyses = useGameStore((s) => s.sessionAnalyses);

  if (sessionAnalyses.length < 3) return null;

  const stats = getSessionStats(sessionAnalyses);

  if (!stats.weakestType) return null;

  const categoryEntries = Object.entries(stats.mistakesByCategory).sort(
    (a, b) => b[1].totalEvLoss - a[1].totalEvLoss,
  );

  // Improvement trend: compare last 3 hands' EV loss to first 3
  const firstThreeEvLoss = sessionAnalyses
    .slice(0, 3)
    .reduce((sum, a) => sum + a.totalEvLoss, 0);
  const lastThreeEvLoss = sessionAnalyses
    .slice(-3)
    .reduce((sum, a) => sum + a.totalEvLoss, 0);
  const improving = lastThreeEvLoss < firstThreeEvLoss;

  const drillConcept = MISTAKE_TO_CONCEPT[stats.weakestType.type] ?? 'cbet_value';

  return (
    <div className="bg-slate-800 rounded-xl p-4 md:p-6 shadow-lg space-y-4">
      <h3 className="text-lg font-semibold text-slate-100">
        Session Patterns
        <span className="text-slate-500 text-sm font-normal ml-2">
          ({stats.totalHands} hands)
        </span>
      </h3>

      {/* Mistake frequency by category */}
      {categoryEntries.length > 0 && (
        <div className="space-y-2">
          {categoryEntries.map(([cat, data]) => {
            const maxEv = categoryEntries[0][1].totalEvLoss || 1;
            const pct = (data.totalEvLoss / maxEv) * 100;
            return (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-400">{CATEGORY_LABELS[cat] ?? cat}</span>
                  <span className="text-slate-500">
                    {data.count}x · -{data.totalEvLoss.toFixed(1)} BB
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500/60 rounded-full transition-all"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Weakest concept */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <p className="text-amber-400 text-xs font-medium mb-0.5">Biggest leak</p>
        <p className="text-slate-200 text-sm font-medium">
          {TYPE_LABELS[stats.weakestType.type] ?? stats.weakestType.type}
        </p>
        <p className="text-slate-500 text-xs">
          {stats.weakestType.count} mistakes · -{stats.weakestType.totalEvLoss.toFixed(1)} BB total
        </p>
      </div>

      {/* Improvement trend */}
      {sessionAnalyses.length >= 6 && (
        <div className={`text-xs font-medium ${improving ? 'text-emerald-400' : 'text-amber-400'}`}>
          {improving
            ? 'Improving — your recent hands show fewer mistakes'
            : 'Steady — keep practicing to reduce mistakes'}
        </div>
      )}

      {/* Drill recommendation */}
      <button
        onClick={() => navigate(`/practice/drills?concept=${drillConcept}`)}
        className="w-full py-2 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 text-sm font-medium hover:bg-emerald-600/30 transition-colors"
      >
        Drill: {TYPE_LABELS[stats.weakestType.type] ?? 'Practice'} &rarr;
      </button>
    </div>
  );
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 4: Commit**

```bash
git add src/components/analysis/SessionPatterns.tsx src/lib/analysis.ts
git commit -m "feat(m3): add SessionPatterns component with mistake category breakdown and drill recommendations"
```

---

### Task 10: Wire everything into AnalysisDashboard and ReviewPage

**Files:**
- Modify: `src/components/analysis/AnalysisDashboard.tsx`
- Modify: `src/pages/ReviewPage.tsx`

**Step 1: Update AnalysisDashboard**

In `src/components/analysis/AnalysisDashboard.tsx`:

1. Add imports:
```typescript
import { HandHistoryChips } from "./HandHistoryChips";
import { WinnerBanner } from "./WinnerBanner";
import { SessionPatterns } from "./SessionPatterns";
```

2. Replace `const analysisData = useGameStore((s) => s.analysisData)` with:
```typescript
const getActiveAnalysis = useGameStore((s) => s.getActiveAnalysis);
const analysisData = getActiveAnalysis();
```

3. In the JSX, add `HandHistoryChips` at the very top (before HandReplay):
```tsx
{/* 0. Hand History Browser */}
<HandHistoryChips />
```

4. Add `WinnerBanner` between the hand number `<h2>` and HeroGrade:
```tsx
{/* 1.5. Winner Banner */}
<WinnerBanner handNumber={analysisData.handNumber} />
```

5. Add `SessionPatterns` between the Mistakes section and the Advanced Stats collapsible:
```tsx
{/* 4.5. Session Patterns */}
<SessionPatterns />
```

**Step 2: Update DrillSetup to read URL search params**

Modify `src/components/drill/DrillSetup.tsx` to read `?concept=X` from the URL and pre-select the matching concept filter on mount.

Add to imports:
```typescript
import { useSearchParams } from 'react-router-dom';
```

Add in the component body (after the store bindings):
```typescript
const [searchParams] = useSearchParams();
const conceptParam = searchParams.get('concept');
```

Add a `useEffect` to apply the concept filter on mount:
```typescript
import { useEffect } from 'react';

useEffect(() => {
  if (conceptParam) {
    const concept = conceptParam as DrillConcept;
    // Only apply if it's a valid concept
    const validConcepts: string[] = [
      'open_raise','three_bet','cold_call','squeeze','steal',
      'cbet_value','cbet_bluff','check_raise','float','probe',
      'barrel','pot_control','semi_bluff','check_call',
      'value_bet_thin','bluff_catch','river_raise','river_bluff',
    ];
    if (validConcepts.includes(concept)) {
      setFilters({ ...filters, concepts: [concept as DrillConcept] });
    }
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 4: Run full tests**

Run: `npx vitest run`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/components/analysis/AnalysisDashboard.tsx src/pages/ReviewPage.tsx src/components/drill/DrillSetup.tsx
git commit -m "feat(m3): wire HandHistoryChips, WinnerBanner, SessionPatterns, and DrillCTA into review flow"
```

---

### Task 11: Integration tests and final verification

**Files:**
- Modify: `src/App.routes.test.tsx`

**Step 1: Add route test for drill CTA navigation**

Add to `src/App.routes.test.tsx`:

```typescript
it('navigates to drills with concept param from review drill CTA', async () => {
  render(
    <MemoryRouter initialEntries={['/practice/drills?concept=value_bet_thin']}>
      <App />
    </MemoryRouter>,
  );
  // DrillSetup should render and the concept filter should be pre-applied
  expect(await screen.findByText(/spot drills/i)).toBeInTheDocument();
});
```

**Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 4: Run build**

Run: `npx vite build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/App.routes.test.tsx
git commit -m "feat(m3): add integration tests for drill CTA routing"
```

---

## Task Summary

| Task | Description | Key files |
|------|-------------|-----------|
| 1 | Types: MistakeType, MistakeCategory, CoachingExplanation | `src/types/poker.ts` |
| 2 | Mistake classification logic | `src/lib/analysis.ts`, tests |
| 3 | Coaching explanation generator + analyzeHand integration | `src/lib/analysis.ts`, tests |
| 4 | selectedAnalysisIndex in gameStore | `src/store/gameStore.ts`, tests |
| 5 | HandHistoryChips component | `src/components/analysis/HandHistoryChips.tsx` |
| 6 | WinnerBanner + DrillCTA components | `src/components/analysis/WinnerBanner.tsx`, `DrillCTA.tsx` |
| 7 | Update MistakeCard with coaching + DrillCTA | `src/components/analysis/MistakeCard.tsx` |
| 8 | Update HandTimeline with coaching | `src/components/analysis/HandTimeline.tsx` |
| 9 | SessionPatterns component + getSessionStats extension | `src/components/analysis/SessionPatterns.tsx`, `src/lib/analysis.ts` |
| 10 | Wire into AnalysisDashboard + DrillSetup URL params | `src/components/analysis/AnalysisDashboard.tsx`, `DrillSetup.tsx` |
| 11 | Integration tests + final verification | `src/App.routes.test.tsx` |
