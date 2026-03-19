# TODO: Frontend UI/UX Overhaul

> Design doc: `docs/plans/2026-03-19-ui-ux-overhaul-design.md`
> Framework: React 18 + TypeScript + Vite + Tailwind CSS v4 + Zustand

---

## Context

- **Target**: React 18, Vite, Tailwind CSS v4, Zustand, Recharts, Lucide React, Vitest
- **Design source**: Written requirements (design doc above), GTOBase/GTO Wizard as UX reference
- **Performance budget**: <200KB gzipped initial load (currently 174KB gzip)
- **Accessibility**: WCAG 2.1 AA for high-impact items (ARIA labels, focus indicators, semantic HTML)
- **Mobile**: 320px–2560px responsive, mobile-first with Tailwind breakpoints

---

## Implementation Plan

- [ ] **FE-PLAN-1.1 Game Table Layout Overhaul**:
  - **Scope**: Fix seat overlaps, cap at 6 players, z-index hierarchy, position labels, active player animation
  - **Components**: `PokerTable.tsx`, `PlayerSeat.tsx`, `CommunityCards.tsx`, `PotDisplay.tsx`
  - **State**: `dealerIndex`, `numPlayers`, `currentPlayerIndex` from Zustand store
  - **Responsive**: Remove 7-9 player configs, add <400px small-screen sizing

- [ ] **FE-PLAN-1.2 AI Action Pacing**:
  - **Scope**: Convert synchronous AI loop to async sequential with 600ms delays and action toasts
  - **Components**: New `ActionToast.tsx`, modify `PokerTable.tsx`
  - **State**: Modify `processAITurns()` in `gameStore.ts` to async, add toast queue state
  - **Responsive**: Toast positioning adapts to seat position

- [ ] **FE-PLAN-1.3 Table HUD (Pot Odds + SPR)**:
  - **Scope**: Show pot odds and SPR as pill badges near pot display during play
  - **Components**: New `TableHUD.tsx`, modify `PotDisplay.tsx`
  - **State**: Compute from `pot`, `currentBet`, Hero's `stack` in store
  - **Responsive**: Badges stack vertically on mobile, horizontal on desktop

- [ ] **FE-PLAN-1.4 Training Mode + Show Hint**:
  - **Scope**: Settings toggle, "Show Hint" button, hint panel calling evaluateDecision()
  - **Components**: New `HintPanel.tsx`, modify `GameSettings.tsx`, `ActionControls.tsx`
  - **State**: `trainingMode` boolean in store (persisted to localStorage), `hintUsed` per decision
  - **Responsive**: Hint panel slides up from bottom on mobile, side panel on desktop

- [ ] **FE-PLAN-1.5 Action Controls Improvements**:
  - **Scope**: Pot odds inline on call button, raise slider shows bet-to-pot ratio
  - **Components**: `ActionControls.tsx`
  - **State**: Compute from pot/bet amounts in store
  - **Responsive**: Percentage text scales with button size

- [ ] **FE-PLAN-2.1 Hand Replay Component**:
  - **Scope**: Mini table showing Hero cards + board at each street, street selector tabs
  - **Components**: New `HandReplay.tsx`
  - **State**: Read from `handHistory` in analysis store
  - **Responsive**: Cards scale down on mobile, tabs become scrollable pills

- [ ] **FE-PLAN-2.2 Decision Timeline Rework**:
  - **Scope**: Board cards per street, side-by-side action comparison, natural language for all decisions
  - **Components**: `HandTimeline.tsx` (major rewrite)
  - **State**: Needs `reasoning` field from Decision type for all decisions (not just mistakes)
  - **Responsive**: Vertical layout on mobile with inline cards, horizontal on desktop

- [ ] **FE-PLAN-2.3 Mistake Cards Improvement**:
  - **Scope**: Educational narrative style, two-column comparison, clear EV callout
  - **Components**: `MistakeCard.tsx` (rewrite)
  - **State**: Same Decision data, different presentation
  - **Responsive**: Two columns collapse to stacked on mobile

- [ ] **FE-PLAN-2.4 Hero Grade + Analysis Layout**:
  - **Scope**: Summary sentence, streak, collapsible advanced sections, reorganized layout
  - **Components**: `HeroGrade.tsx`, `AnalysisDashboard.tsx`, `DecisionChart.tsx`, `EVTracker.tsx`
  - **State**: Session analyses array for streak calculation
  - **Responsive**: Gauge scales, sections full-width on mobile

- [ ] **FE-PLAN-3.1 Settings, Showdown, Mobile & Accessibility**:
  - **Scope**: Settings cap at 5, showdown fix, viewport-fit, small screen sizes, ARIA labels, focus indicators
  - **Components**: `GameSettings.tsx`, `PlayerSeat.tsx`, `ActionControls.tsx`, `index.html`
  - **State**: `showdownDelay` timer in store
  - **Responsive**: <400px breakpoint for seat/card sizing

---

## Implementation Items

### Game Table

- [ ] **FE-ITEM-1.1 PlayerSeat position label badge**:
  - **Props**: Add `position: Position` prop (from poker-engine)
  - **State**: Derived from `dealerIndex`, `seatIndex`, `numPlayers` via `getPosition()`
  - **Accessibility**: `aria-label` including position (e.g., "Player 2, Button position, stack 1500")
  - **Performance**: Position computed once per hand, memoizable

- [ ] **FE-ITEM-1.2 PlayerSeat z-index tiers**:
  - **Props**: Add `isActive`, `isHero` booleans
  - **State**: `currentPlayerIndex` from store
  - **Accessibility**: Active player announced via `aria-live`
  - **Performance**: No impact — CSS only

- [ ] **FE-ITEM-1.3 PlayerSeat active pulse animation**:
  - **Props**: `isActive: boolean`
  - **State**: Driven by `currentPlayerIndex`
  - **Accessibility**: Respect `prefers-reduced-motion` — disable pulse
  - **Performance**: CSS animation only, GPU-composited (ring shadow)

- [ ] **FE-ITEM-1.4 PlayerSeat small-screen sizing**:
  - **Props**: None (CSS breakpoint)
  - **State**: None
  - **Accessibility**: Maintain min touch target 44px
  - **Performance**: No impact — CSS only

- [ ] **FE-ITEM-1.5 PokerTable remove 7-9 configs**:
  - **Props**: None
  - **State**: Remove entries from `getSeatPositions()` for 7, 8, 9
  - **Accessibility**: N/A
  - **Performance**: Slightly less code

- [ ] **FE-ITEM-1.6 PokerTable z-index for center elements**:
  - **Props**: None
  - **State**: None
  - **Accessibility**: N/A
  - **Performance**: No impact

- [ ] **FE-ITEM-2.1 ActionToast component (new)**:
  - **Props**: `{ playerName: string; action: string; amount?: number; position: {x, y} }`
  - **State**: Toast queue managed in PokerTable local state or store
  - **Accessibility**: `role="status"` + `aria-live="polite"`
  - **Performance**: CSS transition for fade, auto-remove after 1.5s

- [ ] **FE-ITEM-2.2 gameStore async AI processing**:
  - **Props**: N/A (store logic)
  - **State**: Convert `processAITurns()` to async, add `isProcessingAI` flag
  - **Accessibility**: N/A
  - **Performance**: setTimeout-based, non-blocking UI thread

- [ ] **FE-ITEM-3.1 TableHUD component (new)**:
  - **Props**: `{ pot: number; heroStack: number; callAmount: number; isHeroTurn: boolean; phase: string }`
  - **State**: Computed from store values
  - **Accessibility**: `aria-label` on badges (e.g., "Pot odds: 3.2 to 1")
  - **Performance**: Simple arithmetic, no memoization needed

- [ ] **FE-ITEM-4.1 HintPanel component (new)**:
  - **Props**: `{ onClose: () => void }`
  - **State**: Calls `evaluateDecision()`, stores result in local state
  - **Accessibility**: Focus trap within panel, Escape to dismiss, `aria-label="Strategy hint"`
  - **Performance**: `evaluateDecision()` ~300-400ms (Monte Carlo), show loading spinner

- [ ] **FE-ITEM-4.2 Training mode toggle in GameSettings**:
  - **Props**: None (reads/writes store)
  - **State**: `trainingMode: boolean` in Zustand store, persisted
  - **Accessibility**: Toggle has `role="switch"`, `aria-checked`
  - **Performance**: No impact

- [ ] **FE-ITEM-4.3 Hint button in ActionControls**:
  - **Props**: `trainingMode: boolean` from store
  - **State**: `showHintPanel: boolean` local state
  - **Accessibility**: `aria-label="Show strategy hint"`
  - **Performance**: Conditional render only

- [ ] **FE-ITEM-5.1 ActionControls pot odds inline**:
  - **Props**: `pot`, `callAmount` from store
  - **State**: Computed
  - **Accessibility**: Screen reader reads "Call 50 dollars, 25 percent of pot"
  - **Performance**: No impact

- [ ] **FE-ITEM-5.2 ActionControls raise ratio display**:
  - **Props**: `pot` from store, `raiseAmount` from local state
  - **State**: Local computed value
  - **Accessibility**: `aria-valuenow`, `aria-valuetext` on slider
  - **Performance**: Re-renders on slider drag — throttle display update

### Analysis Dashboard

- [ ] **FE-ITEM-6.1 HandReplay component (new)**:
  - **Props**: `{ heroCards: Card[]; communityCards: Card[]; phases: PhaseData[]; heroPosition: Position }`
  - **State**: `activeStreet` local state for tab selection
  - **Accessibility**: Tab navigation with `role="tablist"`, `role="tab"`, `role="tabpanel"`
  - **Performance**: Static data, no memoization needed

- [ ] **FE-ITEM-7.1 HandTimeline rewrite**:
  - **Props**: Same input data, completely new rendering
  - **State**: Expandable sections in local state
  - **Accessibility**: Each section is `role="region"` with heading, expand/collapse is `aria-expanded`
  - **Performance**: Render board cards inline — reuse `CardDisplay` component

- [ ] **FE-ITEM-7.2 Natural language explanations for all decisions**:
  - **Props**: `reasoning: string` from Decision type
  - **State**: Ensure analysis engine populates `reasoning` for correct decisions too
  - **Accessibility**: Explanation text is in a readable `<p>` tag
  - **Performance**: String already computed by analysis engine

- [ ] **FE-ITEM-8.1 MistakeCard rewrite**:
  - **Props**: Same `Decision` data
  - **State**: `expanded: boolean` local state (keep)
  - **Accessibility**: `aria-expanded` on toggle, heading hierarchy
  - **Performance**: No impact

- [ ] **FE-ITEM-9.1 HeroGrade summary sentence**:
  - **Props**: `decisions: Decision[]`, `mistakes: Decision[]`
  - **State**: Computed summary text
  - **Accessibility**: Summary read by screen reader
  - **Performance**: Simple string generation

- [ ] **FE-ITEM-9.2 AnalysisDashboard layout reorganization**:
  - **Props**: Same data flow
  - **State**: `showAdvanced: boolean`, `showSessionStats: boolean` local state
  - **Accessibility**: Collapsible sections use `<details>`/`<summary>` or `aria-expanded`
  - **Performance**: Collapsed sections don't render chart (lazy)

### General UX

- [ ] **FE-ITEM-10.1 GameSettings cap at 5 opponents**:
  - **Props**: None
  - **State**: `numOpponents` max changed from 8 to 5
  - **Accessibility**: N/A
  - **Performance**: N/A

- [ ] **FE-ITEM-10.2 AI personality tooltips**:
  - **Props**: None (info displayed in settings)
  - **State**: Static tooltip content
  - **Accessibility**: Tooltip accessible via focus and hover
  - **Performance**: N/A

- [ ] **FE-ITEM-11.1 Showdown delay on fold-win**:
  - **Props**: N/A (store logic)
  - **State**: Add `showdownTimer` or `setTimeout` before transitioning to analysis
  - **Accessibility**: N/A
  - **Performance**: 2-second delay, non-blocking

- [ ] **FE-ITEM-11.2 Showdown hand rank labels**:
  - **Props**: Needs hand evaluation result per player
  - **State**: Use `evaluateHand()` for revealed hands
  - **Accessibility**: `aria-label` on each player's hand description
  - **Performance**: Evaluation already computed during game logic

- [ ] **FE-ITEM-12.1 viewport-fit=cover meta tag**:
  - **Props**: N/A
  - **State**: N/A
  - **Accessibility**: Fixes safe area handling on notched phones
  - **Performance**: N/A

- [ ] **FE-ITEM-12.2 ARIA labels on action buttons and cards**:
  - **Props**: Add `aria-label` to `CardDisplay`, action buttons
  - **State**: N/A
  - **Accessibility**: Screen reader support for card identification and action context
  - **Performance**: N/A

- [ ] **FE-ITEM-12.3 Focus indicators on interactive elements**:
  - **Props**: N/A (CSS)
  - **State**: N/A
  - **Accessibility**: `focus-visible:ring-2 focus-visible:ring-emerald-400` on all buttons/inputs
  - **Performance**: CSS only

---

## Proposed Code Changes

### New Files

#### `src/components/game/ActionToast.tsx`
```tsx
// AI action notification toast
// Props: { playerName, action, amount?, onDismiss }
// Renders near acting player's seat position
// Auto-fades after 1.5s via CSS transition
// role="status" aria-live="polite"
```

#### `src/components/game/TableHUD.tsx`
```tsx
// Pot odds + SPR display
// Shows when Hero faces a bet (pot odds) and from flop onward (SPR)
// Pill badge styling: bg-slate-800/80 text-xs backdrop-blur
```

#### `src/components/game/HintPanel.tsx`
```tsx
// Training mode hint panel
// Calls evaluateDecision() on mount
// Shows loading spinner while computing (~300-400ms)
// Renders: recommended action, reasoning, equity
// Slide-up animation from bottom
// Dismiss on close button or action taken
```

#### `src/components/analysis/HandReplay.tsx`
```tsx
// Mini poker table with street selector
// Tab bar: Preflop | Flop | Turn | River
// Shows Hero's hole cards + board state at selected street
// Below: pot size, position label, effective stack
// Reuses CardDisplay from PlayerSeat
```

### Key Modifications

#### `src/store/gameStore.ts` — Async AI Processing
```diff
+ trainingMode: false,
+ isProcessingAI: false,
+ setTrainingMode: (enabled: boolean) => set({ trainingMode: enabled }),

- processAITurns: () => {
-   while (isAITurn) { ... }  // synchronous loop
- }
+ processAITurns: async () => {
+   set({ isProcessingAI: true });
+   while (isAITurn) {
+     await new Promise(resolve => setTimeout(resolve, 600));
+     // process single AI action
+     // emit toast event
+   }
+   set({ isProcessingAI: false });
+ }
```

#### `src/components/game/PlayerSeat.tsx` — Position Labels + Z-Index
```diff
+ import { getPosition } from '../lib/poker-engine/position';

// Add position badge below player name
+ <span className="text-[10px] text-slate-400 bg-slate-700 px-1.5 py-0.5 rounded">
+   {positionLabel}
+ </span>

// Z-index tiers
- className="z-10"
+ className={cn(
+   isHero ? 'z-12' : 'z-10',
+   isActive && 'z-15',
+ )}
```

#### `index.html` — Viewport Fix
```diff
- <meta name="viewport" content="width=device-width, initial-scale=1.0" />
+ <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

---

## Commands

```bash
# Development
npm run dev

# Type check
npx tsc --noEmit

# Run tests
npm test

# Production build
npm run build

# Lighthouse audit (after build)
npx serve dist -l 3000
# Then run Lighthouse in Chrome DevTools
```

---

## Quality Assurance Task Checklist

- [ ] All components compile without TypeScript errors (`tsc --noEmit`)
- [ ] Responsive design tested at 320px, 768px, 1024px, 1440px, and 2560px
- [ ] All interactive elements are keyboard accessible with visible focus indicators
- [ ] Color contrast meets WCAG AA minimums (verify action buttons, badges, cards)
- [ ] Core Web Vitals pass Lighthouse audit with scores above 90
- [ ] Bundle size impact measured and within 200KB gzipped
- [ ] Animations respect `prefers-reduced-motion` media query
- [ ] TypeScript compiles without errors
- [ ] All 149 existing tests still pass
- [ ] AI action pacing feels natural (600ms delay, toast visible)
- [ ] Hint panel loads within 500ms (Monte Carlo computation)
- [ ] Analysis explanations are clear and educational for each decision
- [ ] Hand replay shows correct board state per street
