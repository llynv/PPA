# M3: Review Upgrade — Design

**Goal:** Transform the review page from a raw data dump into a coaching experience — categorize mistakes by concept, explain them in coaching language, connect them to drills, and surface session-level patterns.

**Status:** Design approved, ready for implementation planning.

---

## 1. Mistake Taxonomy

### MistakeType — specific patterns

| Type | Description | Detection rule |
|------|-------------|----------------|
| `OVERFOLD` | Folding when calling/raising is +EV | Hero folded, optimal is call/raise, equity > pot odds threshold |
| `OVERCALL` | Calling when folding is optimal | Hero called, optimal is fold, hero action frequency < 20% |
| `MISSED_VALUE_BET` | Checking/calling when raising is optimal | Hero checked/called, optimal is raise, equity > 60% |
| `MISSED_CBET` | Not continuation betting when in position as preflop aggressor | Hero checked flop in position after raising preflop, optimal is bet |
| `BAD_SIZING_OVER` | Bet/raise too large | Hero bet/raised, sizing > 150% of optimal |
| `BAD_SIZING_UNDER` | Bet/raise too small | Hero bet/raised, sizing < 60% of optimal |
| `CALLING_WITHOUT_ODDS` | Calling without pot odds to continue | Hero called, equity < pot odds, no significant draws |
| `BLUFF_WRONG_SPOT` | Raising/betting as a bluff in a bad spot | Hero raised, equity < 30%, board texture is dry, no draws |
| `MISSED_DRAW_PLAY` | Not playing a drawing hand aggressively | Hero has flush/straight draw (8+ outs), folded or called when raising is optimal |
| `PASSIVE_WITH_EQUITY` | Playing passively with strong equity | Hero called, equity > 55%, optimal is raise |

### MistakeCategory — broader buckets

| Category | Included types |
|----------|---------------|
| `FREQUENCY` | OVERFOLD, OVERCALL, PASSIVE_WITH_EQUITY |
| `SIZING` | BAD_SIZING_OVER, BAD_SIZING_UNDER |
| `AGGRESSION` | MISSED_VALUE_BET, MISSED_CBET, BLUFF_WRONG_SPOT |
| `EQUITY_REALIZATION` | CALLING_WITHOUT_ODDS, MISSED_DRAW_PLAY |

Classification lives in `analysis.ts` as pure deterministic functions. No AI/ML.

---

## 2. Coaching Explanations

Replace the single `reasoning` string with a structured `CoachingExplanation`:

```typescript
interface CoachingExplanation {
  whatHappened: string;    // "You folded facing a 3BB bet on the flop"
  whyMistake: string;     // "With 42% equity and 3.5:1 pot odds, you only needed 22%..."
  whatToDo: string;       // "In this spot, calling is +EV. Your flush draw gives you 9 outs..."
  concept: MistakeType;   // Links to drill routing
}
```

Both `HandTimeline` and `MistakeCard` render these three sections with clear visual hierarchy:
- **What happened** — neutral description, gray
- **Why it's a mistake** — the math/reasoning, amber
- **What to do instead** — actionable coaching, green

For correct decisions (no mistake), only `whatHappened` is populated as a positive reinforcement message.

---

## 3. Drill CTAs in Review

Each `MistakeCard` gets a "Practice this" button:

- Maps `MistakeType` → `DrillConcept[]` via lookup table
- Navigates to `/practice/drills?concept=RIVER_VALUE` (or similar)
- DrillSetup reads search params and pre-applies the matching filter

Mapping table:

| MistakeType | DrillConcept(s) |
|-------------|-----------------|
| OVERFOLD | FOLD_EQUITY, POT_ODDS |
| OVERCALL | POT_ODDS, FOLD_EQUITY |
| MISSED_VALUE_BET | RIVER_VALUE, VALUE_BET |
| MISSED_CBET | CBET, FLOP_CBET |
| BAD_SIZING_OVER | BET_SIZING |
| BAD_SIZING_UNDER | BET_SIZING |
| CALLING_WITHOUT_ODDS | POT_ODDS, DRAW_PLAY |
| BLUFF_WRONG_SPOT | BLUFF, FOLD_EQUITY |
| MISSED_DRAW_PLAY | DRAW_PLAY, SEMI_BLUFF |
| PASSIVE_WITH_EQUITY | VALUE_BET, AGGRESSION |

The exact concept names will be matched against the `DrillConcept` enum from `src/types/drill.ts` during implementation.

---

## 4. Session Patterns Panel

New `SessionPatterns` component, visible after 3+ hands reviewed in a session.

Sections:
- **Mistake frequency by category** — horizontal bars showing how many mistakes per MistakeCategory
- **Weakest concept** — the MistakeType with the most occurrences + total EV loss
- **Improvement trend** — simple up/down indicator comparing last 3 hands' EV loss to first 3
- **Drill recommendation** — "Your biggest leak is [X]. Practice it?" with CTA button

Data source: `sessionAnalyses[]` array, computed at render time (no new store state needed).

Refactor `getSessionStats()` in `analysis.ts` to return mistake-type breakdowns alongside existing stats.

---

## 5. Winner Display

Add a `WinnerBanner` between hand number and HeroGrade in AnalysisDashboard:
- Shows winner name and winning hand (e.g., "You won with Two Pair" or "AI 3 won with Flush")
- Green if hero won, red/neutral if hero lost
- Uses existing `winner` and `winnerHand` from store state

---

## 6. Hand History Browser

Horizontal scrollable chip row at top of ReviewPage:
- Each chip shows: hand number + grade (e.g., "Hand 3 — A+")
- Active chip is highlighted
- Clicking loads that hand's AnalysisData into the dashboard

Store changes:
- Add `selectedAnalysisIndex: number` to gameStore (defaults to latest)
- AnalysisDashboard reads `sessionAnalyses[selectedAnalysisIndex]` instead of `analysisData`
- "Next Hand" no longer clears `sessionAnalyses`; "Back to Practice" still resets everything

---

## Architecture

### New types (in `poker.ts`)

```typescript
type MistakeType = 'OVERFOLD' | 'OVERCALL' | 'MISSED_VALUE_BET' | 'MISSED_CBET' 
  | 'BAD_SIZING_OVER' | 'BAD_SIZING_UNDER' | 'CALLING_WITHOUT_ODDS' 
  | 'BLUFF_WRONG_SPOT' | 'MISSED_DRAW_PLAY' | 'PASSIVE_WITH_EQUITY';

type MistakeCategory = 'FREQUENCY' | 'SIZING' | 'AGGRESSION' | 'EQUITY_REALIZATION';

interface CoachingExplanation {
  whatHappened: string;
  whyMistake: string;
  whatToDo: string;
  concept: MistakeType;
}
```

### Modified types

- `Mistake` — add `type: MistakeType`, `category: MistakeCategory` fields
- `Decision` — add `coaching: CoachingExplanation | null` field

### New functions (in `analysis.ts`)

- `classifyMistake(decision, heroAction, optimalAction, context)` → `{ type, category }`
- `generateCoaching(decision, mistakeType, context)` → `CoachingExplanation`
- Refactored `getSessionStats()` → includes `mistakesByType`, `mistakesByCategory`

### New components

- `SessionPatterns` — session-level mistake pattern analysis
- `WinnerBanner` — simple winner display
- `HandHistoryChips` — horizontal scrollable hand selector
- `DrillCTA` — "Practice this" button in MistakeCard

### Modified components

- `HandTimeline` — render CoachingExplanation sections
- `MistakeCard` — render coaching + DrillCTA
- `AnalysisDashboard` — add new sections, read from selectedAnalysisIndex
- `ReviewPage` — add HandHistoryChips

### Store changes

- `gameStore`: add `selectedAnalysisIndex`, `selectAnalysis(index)` action

---

## What's NOT in M3

- No persistence (M7)
- No progress/mastery tracking (M4)
- No learning path / onboarding (M5)
- No opponent analysis
- No hand export/share
- No animated replay
- No "what if" counterfactuals
