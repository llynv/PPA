# UI/UX Overhaul Design

**Date:** 2026-03-19
**Status:** Approved
**Scope:** Game table layout, training features, analysis dashboard

## Context

The Poker Practice App (PPA) has a functional game engine and AI/analysis backend after the recent poker-engine overhaul, but the frontend has significant UX issues:

1. **Game table layout collisions** — seats overlap at 7+ players, Hero seat bleeds into action bar, bet chips overlap adjacent seats, all seats share z-10, AI turns are instant with no visual feedback
2. **No training features** — no hints, no position labels, no pot odds display, no action log — feels like a poker game, not a poker trainer
3. **Analysis dashboard is confusing** — reasoning only on mistakes, no hand replay, abstract timeline without board context, charts without explanation

Reference: GTOBase and GTO Wizard trainer patterns — hint button, instant feedback, hand replay, natural language explanations, position/odds overlays.

## Design Decisions

### Player Cap

- **Cap at 6 players max** (Hero + 1-5 AI opponents)
- Settings page shows opponent selector: 1, 2, 3, 4, 5
- Removes all 7/8/9-player seat position configs
- Standard for GTO trainers; eliminates all mobile cramping issues

### Training Mode

- **Toggle in settings**: "Training Mode" (on/off, defaults off)
- Persisted to localStorage via Zustand persist
- When ON during play: "Show Hint" button appears above action controls
- Clicking "Show Hint" calls `evaluateDecision()` with current game state
- Shows: recommended action, reasoning text, equity estimate
- Appears as a slide-up panel, dismissible, non-blocking
- Track hint usage in hand history (mark decisions where hint was used)

---

## Section 1: Game Table Overhaul

### Seat Layout

- Remove 7/8/9-player position configs from `POSITION_COORDS` and `POSITION_CLASSES`
- Maintain layouts for 2, 3, 4, 5, 6 players only
- Fix z-index hierarchy:
  - Community cards + pot: `z-20`
  - Active player seat: `z-15`
  - Hero seat: `z-12`
  - Other seats: `z-10`
  - Bet chips: `z-5`

### Position Labels

- Show position label (UTG, MP, CO, BTN, SB, BB) as small badge below player name
- Use `getPosition()` from `poker-engine/position.ts`
- Badge styling: muted color pill, e.g., `bg-slate-700 text-xs px-1.5 py-0.5 rounded`

### Table HUD

- **Pot odds**: shown as pill badge near pot display when Hero faces a bet
  - Format: "Pot Odds: 3.2:1 (24%)"
  - Only visible when Hero has a pending call
- **SPR**: shown next to pot display
  - Format: "SPR: 8.5"
  - Calculated as Hero effective stack / pot size
  - Visible from flop onward

### AI Action Pacing

- Convert `processAITurns()` from synchronous while-loop to async sequential processing
- 600ms delay between each AI action
- Toast notification per AI action near the acting player's seat:
  - "Player 2 folds", "Player 3 raises to $120"
  - Toast fades after 1.5s
- Active player seat gets a pulsing ring animation during "thinking" time
- Implementation: use `setTimeout` with a queue, or `requestAnimationFrame` + state updates

### Action Controls

- Show pot odds inline when facing a bet: "Call $50 (25% of pot)"
- Raise slider shows bet-to-pot ratio as user drags

### Show Hint (Training Mode)

- Button appears above action controls only when `trainingMode === true` and it's Hero's turn
- Calls `evaluateDecision()` from `poker-engine/decision.ts`
- Renders a slide-up panel showing:
  - Recommended action (e.g., "Raise to $120")
  - Reasoning (natural language string from decision engine)
  - Equity estimate (e.g., "Your equity: 62%")
- Panel is dismissible with a close button or by taking an action
- `hintUsed: boolean` flag stored per decision in hand history

---

## Section 2: Analysis Dashboard Overhaul

### Hand Replay Component (new)

- Replaces abstract title at top of analysis
- Mini poker table rendering showing:
  - Hero's hole cards (always visible)
  - Community cards at each street
  - Final board state
- Street selector tabs: Preflop | Flop | Turn | River
  - Clicking each tab shows board state at that street
- Below mini table: pot size at that street, Hero's position label, effective stack
- Uses existing card rendering components (`CardDisplay`)

### Decision Timeline Rework

- Each street section now shows:
  - **Board cards** at that street (visual card components, not text)
  - Hero's action vs optimal action **side-by-side** with color coding:
    - Green = correct decision
    - Amber = minor mistake
    - Red = major mistake
  - **Natural language explanation for EVERY decision** (not just mistakes):
    - Correct: "Good play. With 62% equity facing 24% pot odds, calling is the highest EV action."
    - Mistake: "Suboptimal. You folded 62% equity — calling has +3.2 BB EV."
  - EV impact in BB shown inline
  - Expandable "Details" section: equity/pot odds/SPR, draws, board texture, EV by action table

### Mistake Cards

- Keep expandable accordion pattern
- Improved content structure:
  - Lead with natural language explanation (large, readable font)
  - "What you did" vs "What was optimal" as visual two-column comparison
  - EV difference as clear callout: "This cost you X.XX BB"
  - Board texture and draw info as visual badges
  - Remove raw data dump style — present as educational narrative

### Hero Grade

- Keep circular gauge
- Add subtitle context: "4 decisions, 1 mistake"
- Add one-sentence summary: "Strong play — one minor sizing error on the turn"
- Session streak indicator if multiple hands: "3-hand streak of A+ grades"

### Reorganized Sections

- Move `DecisionChart` (frequency bar chart) to expandable "Advanced Stats" section at bottom
- Move `EVTracker` session chart to expandable "Session Stats" section at bottom
- Default collapsed — available for advanced users who want the data

---

## Section 3: General UX & Polish

### Settings Page

- Cap opponents at 5 (buttons: 1, 2, 3, 4, 5)
- Add "Training Mode" toggle with description text
- Add AI personality tooltips on hover/tap:
  - TAG = "Tight-Aggressive: plays few hands but bets aggressively"
  - LAG = "Loose-Aggressive: plays many hands and bets aggressively"
  - Tight-passive = "Tight-Passive: plays few hands and rarely raises"
  - Loose-passive = "Loose-Passive: plays many hands but rarely raises"

### Showdown

- Fix auto-skip: when Hero wins by everyone folding, show showdown overlay for 2 seconds before enabling navigation
- Show all revealed hands with hand rank labels (e.g., "Two Pair, Aces and Kings")

### Mobile Fixes

- Add `viewport-fit=cover` to `<meta name="viewport">` in `index.html`
- Implement small-screen sizing (<400px breakpoint):
  - Seats: `min-w-[76px]`
  - Cards: `w-7 h-10`
- This was planned in original mobile design but never implemented

### Accessibility (Minimal Viable)

- `aria-label` on all action buttons with context (e.g., `aria-label="Fold your hand"`)
- `aria-label` on card components (e.g., `aria-label="Ace of Spades"`)
- `role="status"` and `aria-live="polite"` on AI action toasts
- Visible focus indicators (`focus-visible:ring-2`) on all interactive elements
- Semantic `<section>` tags with heading hierarchy in analysis dashboard

---

## Files Affected

### New Files
- `src/components/game/ActionToast.tsx` — AI action toast notification
- `src/components/game/TableHUD.tsx` — Pot odds + SPR display
- `src/components/game/HintPanel.tsx` — Show Hint slide-up panel
- `src/components/analysis/HandReplay.tsx` — Mini table hand replay

### Modified Files
- `src/components/settings/GameSettings.tsx` — cap at 5, training mode toggle
- `src/components/game/PokerTable.tsx` — remove 7-9 layouts, z-index fix, AI pacing, HUD integration
- `src/components/game/PlayerSeat.tsx` — position labels, z-index tiers, small-screen sizes, active pulse
- `src/components/game/ActionControls.tsx` — pot odds inline, hint button, raise ratio display
- `src/components/game/CommunityCards.tsx` — z-index update
- `src/components/game/PotDisplay.tsx` — z-index update, HUD integration
- `src/components/analysis/AnalysisDashboard.tsx` — new layout with HandReplay, collapsible advanced sections
- `src/components/analysis/HandTimeline.tsx` — board cards, side-by-side comparison, explanations for all decisions
- `src/components/analysis/MistakeCard.tsx` — educational narrative style, two-column comparison
- `src/components/analysis/HeroGrade.tsx` — summary sentence, streak indicator
- `src/components/analysis/DecisionChart.tsx` — moved to collapsible section
- `src/components/analysis/EVTracker.tsx` — moved to collapsible section
- `src/store/gameStore.ts` — async AI turns, training mode state, hint tracking
- `src/types/poker.ts` — hintUsed flag on Decision type
- `index.html` — viewport-fit=cover

---

## Non-Goals

- No card dealing animations (future enhancement)
- No custom blind/stack input (YAGNI)
- No AI personality selection by user (random assignment stays)
- No full interactive hand replayer (step-through) — just static street-by-street view
- No WCAG AA full compliance — just the high-impact items listed above
