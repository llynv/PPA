# Strategy Desk — Live Table Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the live poker table gameplay surface from an amateur prototype into a professional "Strategy Desk" GTO coaching workstation.

**Architecture:** Replace the monolithic `PokerTable` component with a composable shell (`TableShell`) that orchestrates new focused components: `GameTopBar`, `BoardCenter`, `SeatRing`/`SeatCard`, `HeroDock`, `RaiseControls`, `CoachPanel`, and `ActivityRibbon`. Desktop uses a table + coach rail layout; mobile stacks vertically.

**Tech Stack:** React 18, TypeScript (strict `tsc -b`), Tailwind CSS v4, Zustand, Vitest, Vite

**Design Document:** `docs/plans/2026-03-27-live-table-strategy-desk-design.md`

**IMPORTANT BUILD NOTES:**
- Build uses `tsc -b` which enforces `noUnusedLocals` and `noUnusedParameters`. Prefix unused params with `_`.
- Codebase uses DOUBLE QUOTES. Some drill-domain files use single quotes.
- All new files must pass `npx tsc -b && npx vitest run`.
- Run tests from the worktree root: `/Users/linvg/Documents/Workspace/PPA/.worktrees/strategy-desk`

---

## Task 1: Visual Tokens + Fonts + TableShell + GameTopBar

**Goal:** Establish the Strategy Desk visual foundation and the page-level layout shell.

**Files:**
- Modify: `index.html` — add Google Fonts link
- Modify: `src/index.css` — replace `.poker-table-bg` with Strategy Desk tokens
- Create: `src/components/game/TableShell.tsx` — gameplay page frame
- Create: `src/components/game/GameTopBar.tsx` — session context bar
- Modify: `src/pages/LiveTablePage.tsx` — switch from `PokerTable` to `TableShell`
- Create: `src/components/game/__tests__/TableShell.test.tsx`

**Design tokens (add to `index.css` as CSS custom properties on `:root`):**

```css
:root {
  --sd-bg: #121214;
  --sd-surface: #1c1c20;
  --sd-felt: #1a3a2a;
  --sd-felt-edge: #0f2a1e;
  --sd-rail: #2a2a2e;
  --sd-rail-highlight: #3a3a3e;
  --sd-smoke: rgba(255, 255, 255, 0.06);
  --sd-brass: #c9a94e;
  --sd-brass-muted: #a08838;
  --sd-ivory: #f5f0e8;
  --sd-fold: #dc4a4a;
  --sd-check: #4adc7a;
  --sd-raise: #4a9adc;
  --sd-allin: #dc8a4a;

  font-family: "IBM Plex Sans", system-ui, sans-serif;
}
```

**Fonts (add to `index.html` `<head>`):**

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
```

**`index.css` changes:**
- Replace `.poker-table-bg` grid pattern with new `.strategy-desk-bg` using `var(--sd-bg)` solid color (no grid lines)
- Update `body` background to `var(--sd-bg)`
- Remove the old `.pot-display` class

**`TableShell` structure:**

```tsx
export function TableShell() {
  // Reads gamePhase, isShowdown
  // Desktop: flex row with table area (flex-1) + CoachPanel (w-72)
  // Mobile: flex column with table area + HeroDock + CoachPanel toggle
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--sd-bg)" }}>
      <GameTopBar />
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Table stage area — will be filled in Task 2+ */}
          <div className="flex-1 relative">
            {/* Placeholder: renders existing PokerTable internals for now */}
          </div>
          {/* HeroDock — Task 4 */}
          {!isShowdown && <div>{/* placeholder for HeroDock */}</div>}
        </div>
        {/* CoachPanel rail — Task 5, desktop only */}
      </div>
    </div>
  );
}
```

For Task 1, `TableShell` should render the existing `PokerTable` content in its table stage area as a transitional step. It wraps `GameTopBar` at the top and delegates to the old `PokerTable` for the table content. Later tasks will replace `PokerTable` internals piece by piece.

**`GameTopBar` structure:**

```tsx
export function GameTopBar() {
  const handNumber = useGameStore((s) => s.handNumber);
  const currentRound = useGameStore((s) => s.currentRound);
  const settings = useGameStore((s) => s.settings);
  
  return (
    <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b"
         style={{ background: "var(--sd-surface)", borderColor: "var(--sd-smoke)" }}>
      <span>Hand #{handNumber}</span>
      <span>{currentRound}</span>
      <span>{settings.smallBlind}/{settings.bigBlind}</span>
    </div>
  );
}
```

**`LiveTablePage` change:** Replace `<PokerTable />` with `<TableShell />` for the playing/showdown phases.

**Tests:**
- `TableShell` renders `GameTopBar` with hand number
- `TableShell` renders table stage area
- `GameTopBar` displays correct round label and blind level

**Verification:**
```bash
npx tsc -b && npx vitest run
```

All 319+ existing tests must still pass. New tests must pass.

**Commit:** `feat(strategy-desk): add visual tokens, fonts, TableShell and GameTopBar`

---

## Task 2: BoardCenter + ActivityRibbon (Replace Board Overlays)

**Goal:** Create a unified board center that combines pot, community cards, street label, and a non-blocking AI action ribbon. Remove the board-covering `ActionToast`.

**Files:**
- Create: `src/components/game/BoardCenter.tsx`
- Create: `src/components/game/ActivityRibbon.tsx`
- Modify: `src/components/game/TableShell.tsx` — integrate BoardCenter into table stage
- Create: `src/components/game/__tests__/BoardCenter.test.tsx`

**`BoardCenter` replaces**: the center content in `PokerTable.tsx:377-384` (PotDisplay + CommunityCards + TableHUD) and `ActionToast` (line 387).

**`BoardCenter` structure:**

```tsx
export function BoardCenter() {
  // Reads: pot, communityCards, currentRound from gameStore
  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Pot display */}
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: "var(--sd-brass)" }}>
        Pot: {pot.toFixed(2)}
      </div>
      
      {/* Community cards */}
      <div className="flex gap-1">
        {cards.map(...)}
        {emptySlots.map(...)}
      </div>
      
      {/* Street label */}
      <span style={{ color: "var(--sd-ivory)", opacity: 0.4 }}>
        {ROUND_LABELS[currentRound]}
      </span>
      
      {/* Activity ribbon — AI action feedback */}
      <ActivityRibbon />
    </div>
  );
}
```

**`ActivityRibbon` replaces**: `ActionToast.tsx`. Instead of centering a toast over the board, it renders a slim horizontal strip BELOW the cards:

```tsx
export function ActivityRibbon() {
  const toast = useGameStore((s) => s.aiActionToast);
  if (!toast) return null;
  
  const message = toast.amount != null
    ? `${toast.playerName} ${toast.action} $${toast.amount.toLocaleString()}`
    : `${toast.playerName} ${toast.action}`;
  
  return (
    <div role="status" aria-live="polite"
         className="text-xs font-medium px-3 py-1 rounded-full"
         style={{ background: "var(--sd-smoke)", color: "var(--sd-ivory)", opacity: 0.7 }}>
      {message}
    </div>
  );
}
```

**Integration:** In `TableShell`, the table oval's center content becomes `<BoardCenter />` instead of the old PotDisplay + CommunityCards + TableHUD + ActionToast stack.

At this point, keep the rest of PokerTable's structure (oval, seats, showdown overlay) but swap out the center content.

**Tests:**
- `BoardCenter` renders pot amount
- `BoardCenter` renders community cards
- `BoardCenter` renders street label
- `ActivityRibbon` renders AI action message when toast is present
- `ActivityRibbon` renders nothing when no toast
- `ActivityRibbon` never has absolute positioning over center

**Commit:** `feat(strategy-desk): add BoardCenter and ActivityRibbon, replace ActionToast`

---

## Task 3: SeatRing + SeatCard + PlayingCard Upgrade

**Goal:** Replace the fragile `getSeatLayouts()` switch-case and the competing `PlayerProfile`/`PlayerSeat` components with a trigonometric seat ring and a single unified seat card. Upgrade `PlayingCard` to a cleaner 2-color classic look.

**Files:**
- Create: `src/components/game/SeatRing.tsx`
- Create: `src/components/game/SeatCard.tsx`
- Modify: `src/components/game/PlayingCard.tsx` — 2-color classic redesign
- Modify: `src/components/game/TableShell.tsx` — use SeatRing instead of old player mapping
- Create: `src/components/game/__tests__/SeatRing.test.tsx`

**`SeatRing` structure:**

```tsx
interface SeatRingProps {
  players: Player[];
  activePlayerIndex: number;
  dealerIndex: number;
  isShowdown: boolean;
}

export function SeatRing({ players, activePlayerIndex, dealerIndex, isShowdown }: SeatRingProps) {
  const n = players.length;
  
  return (
    <>
      {players.map((player, i) => {
        // Trigonometric positioning: hero at bottom, others distributed around ellipse
        const angle = Math.PI / 2 + (2 * Math.PI * i) / n;
        const rx = 42; // % of container width
        const ry = 38; // % of container height
        const x = 50 + rx * Math.cos(angle);
        const y = 50 - ry * Math.sin(angle);
        
        const isActive = !isShowdown && i === activePlayerIndex;
        const profilePlacement: "top" | "bottom" = y > 50 ? "bottom" : "top";
        
        return (
          <div key={player.id}
               className={`absolute z-${player.isHero ? "[12]" : "10"} ${isActive ? "z-[15]" : ""}`}
               style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}>
            <SeatCard
              player={player}
              isActive={isActive}
              isDealer={i === dealerIndex}
              seatIndex={i}
              dealerIndex={dealerIndex}
              playerCount={n}
              placement={profilePlacement}
            />
          </div>
        );
      })}
    </>
  );
}
```

**`SeatCard`** — unified seat component replacing both `PlayerProfile` and `PlayerSeat`. Uses the same props interface as `PlayerProfile` and the same Zustand selectors. Styled with Strategy Desk tokens:

- Card area with `--sd-surface` background
- Name in `Space Grotesk` font, uppercase
- Stack in `IBM Plex Mono`, brass color
- Position tag uses the same color mapping as current `POSITION_TAG_COLORS`
- Active ring uses `--sd-brass` instead of emerald
- Winner ring uses `--sd-brass`
- Dealer button uses `--sd-brass` background

**`PlayingCard` upgrade:**

```tsx
const SUIT_COLOR: Record<Suit, string> = {
  hearts: "text-red-500",
  diamonds: "text-red-500",
  clubs: "text-neutral-800",
  spades: "text-neutral-800",
};

// White/cream face card with colored rank/suit text
// No more solid-color backgrounds per suit
```

Face-down card pattern updated to use `--sd-rail` colors.

**Tests:**
- `SeatRing` renders correct number of seats for 2, 3, 4, 5, 6 players
- `SeatRing` places hero (index 0) at approximately bottom center (y > 80%)
- `SeatCard` shows player name, stack, position tag
- `SeatCard` shows active ring when isActive
- `SeatCard` shows dealer button when isDealer
- `SeatCard` shows folded state with reduced opacity
- `PlayingCard` renders rank and suit symbol for face-up card
- `PlayingCard` renders face-down pattern

**Commit:** `feat(strategy-desk): add SeatRing, SeatCard, upgrade PlayingCard to 2-color`

---

## Task 4: HeroDock + RaiseControls

**Goal:** Replace the flat `ActionControls` with a visually hierarchical hero dock and an extracted raise flow.

**Files:**
- Create: `src/components/game/HeroDock.tsx`
- Create: `src/components/game/RaiseControls.tsx`
- Modify: `src/components/game/TableShell.tsx` — wire HeroDock into bottom slot
- Create: `src/components/game/__tests__/HeroDock.test.tsx`

**`HeroDock`** — sticky bottom bar with strong button hierarchy:

```
┌────────────────────────────────────────────┐
│  [Fold]  [Check/Call ✓]  [Raise ▸]  [All-in] │
└────────────────────────────────────────────┘
```

Button styles:
- **Fold**: outline style, `--sd-fold` border/text, not prominent
- **Check/Call**: filled `--sd-check` bg, white text, the "safe default"
- **Raise**: filled `--sd-raise` bg, white text, prominent, opens RaiseControls
- **All-in**: outline `--sd-allin` border/text, dramatic but not default

The dock uses `safe-area-inset-bottom` padding for mobile notch.

Dock background: `var(--sd-surface)` with top border `var(--sd-smoke)`.

**`RaiseControls`** — extracted from `ActionControls`. Renders inline above the action buttons when raise is tapped:

```
┌────────────────────────────────────────────┐
│  Raise: $150  (1.5x pot)                   │
│  [slider ══════════════════════]            │
│  [1/3] [1/2] [3/4] [Pot] [All-in]         │
│  [════════ Confirm Raise $150 ════════]     │
├────────────────────────────────────────────┤
│  [Fold]  [Check/Call]  [Raise ▸]  [All-in] │
└────────────────────────────────────────────┘
```

Uses `IBM Plex Mono` for the raise amount display.

**Logic:** All action handler logic (handleFold, handleCheckCall, handleRaise, handleAllIn, preset chips) is preserved exactly from `ActionControls.tsx`. Only the visual presentation changes.

**`HeroDock` also absorbs the "not hero turn" guard** — returns null if `!isHeroTurn || !heroPlayer || isProcessingAI`.

**Tests:**
- `HeroDock` renders 4 action buttons when it's hero's turn
- `HeroDock` renders nothing when it's not hero's turn
- `HeroDock` renders nothing when AI is processing
- Fold button has fold styling
- Check button shows "CHECK" when no bet to call, "CALL $X" when facing bet
- Raise button opens `RaiseControls` panel
- `RaiseControls` renders slider, preset chips, confirm button
- Preset chip "1/2 Pot" sets slider to half pot
- Confirm raise calls `performAction` with correct amount

**Commit:** `feat(strategy-desk): add HeroDock and RaiseControls with visual hierarchy`

---

## Task 5: CoachPanel (Unified Coaching Surface)

**Goal:** Consolidate `HintPanel` + `TableHUD` into a single `CoachPanel` that renders as a desktop right rail or mobile bottom sheet.

**Files:**
- Create: `src/components/game/CoachPanel.tsx`
- Modify: `src/components/game/TableShell.tsx` — wire CoachPanel into layout
- Create: `src/components/game/__tests__/CoachPanel.test.tsx`

**`CoachPanel` structure (desktop):**

```
┌─────────────────────┐
│  COACH               │
│                      │
│  ┌────────────────┐ │
│  │ Pot Odds: 3.2:1│ │
│  │ (31%)          │ │
│  └────────────────┘ │
│  ┌────────────────┐ │
│  │ SPR: 4.2       │ │
│  └────────────────┘ │
│                      │
│  ┌────────────────┐ │
│  │ [Show Hint]    │ │
│  │                │ │
│  │ GTO says: Call │ │
│  │ Equity: 42%    │ │
│  │ Reasoning...   │ │
│  └────────────────┘ │
└─────────────────────┘
```

- Desktop: `w-72` fixed rail, `var(--sd-surface)` bg, left border `var(--sd-smoke)`, always visible
- Mobile: collapsible sheet below HeroDock, toggle button "Coach ▸"

**Logic:** Merges the hint calculation from `HintPanel.tsx:35-127` and the pot odds/SPR calculation from `TableHUD.tsx:16-32`. Both calculations only show when relevant (hero's turn, training mode enabled, etc.).

The `CoachPanel` checks `trainingMode` — if false, it doesn't render at all.

**Tests:**
- `CoachPanel` renders pot odds when hero faces a bet
- `CoachPanel` renders SPR from flop onward
- `CoachPanel` renders "Show Hint" button in training mode
- `CoachPanel` shows GTO hint after clicking "Show Hint"
- `CoachPanel` renders nothing when training mode is off
- `CoachPanel` renders nothing when it's not hero's turn
- Desktop: CoachPanel is visible as a rail (w-72)
- Mobile: CoachPanel is collapsible

**Commit:** `feat(strategy-desk): add CoachPanel, consolidate coaching into single surface`

---

## Task 6: Full Stage Composition (Desktop + Mobile)

**Goal:** Wire everything together in `TableShell` and remove the old `PokerTable` monolith. Ensure desktop and mobile layouts work correctly.

**Files:**
- Modify: `src/components/game/TableShell.tsx` — complete composition
- Delete old components that are fully replaced (mark as unused, remove imports)
- Modify: `src/components/game/PokerTable.tsx` — extract ShowdownOverlay, delete rest or keep as deprecated wrapper
- Create: `src/components/game/__tests__/PokerTable.responsive.test.tsx`

**The final `TableShell` composition:**

```tsx
export function TableShell() {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const isShowdown = gamePhase === "showdown";
  
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--sd-bg)" }}>
      <GameTopBar />
      <div className="flex-1 flex min-h-0">
        {/* Table + dock column */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Table stage */}
          <div className="flex-1 relative flex items-center justify-center p-4 md:p-8">
            {/* Oval table with felt */}
            <div className="relative w-[90%] max-w-[700px] aspect-[2/1]" style={{ maxHeight: "min(350px, 50vh)" }}>
              {/* Rail */}
              <div className="absolute inset-0 rounded-[200px] p-2 md:p-[14px]"
                   style={{ background: "linear-gradient(180deg, var(--sd-rail-highlight), var(--sd-rail))" }}>
                {/* Felt */}
                <div className="w-full h-full rounded-[186px] relative overflow-hidden"
                     style={{ background: "radial-gradient(ellipse, var(--sd-felt), var(--sd-felt-edge))" }}>
                  <TableWatermark />
                  <BoardCenter />
                </div>
              </div>
              <SeatRing players={players} ... />
              {isShowdown && <ShowdownOverlay />}
            </div>
          </div>
          
          {/* Hero dock */}
          {!isShowdown && <HeroDock />}
          
          {/* Mobile coach sheet */}
          <div className="md:hidden">
            <CoachPanel variant="sheet" />
          </div>
        </div>
        
        {/* Desktop coach rail */}
        <div className="hidden md:block">
          <CoachPanel variant="rail" />
        </div>
      </div>
    </div>
  );
}
```

**Cleanup:**
- Remove `ActionToast` import/usage (replaced by `ActivityRibbon`)
- Remove `TableHUD` import/usage (replaced by `CoachPanel`)
- Remove `HintPanel` import/usage (replaced by `CoachPanel`)
- Remove `ActionControls` import/usage (replaced by `HeroDock`)
- Remove `PotDisplay` import/usage (replaced by `BoardCenter`)
- Keep old `CommunityCards` if `BoardCenter` delegates to it, or inline the card rendering
- Move `ShowdownOverlay` to its own file or keep it in `PokerTable.tsx` and import from there
- Remove `PlayerProfile` import in PokerTable (replaced by `SeatCard` via `SeatRing`)
- `PlayerSeat.tsx` can be deleted (was already unused by PokerTable)

**Tests:**
- Desktop layout: coach rail is visible
- Mobile layout: coach rail is hidden, coach sheet exists
- Table renders seats via SeatRing
- Table renders BoardCenter
- HeroDock renders below table
- ShowdownOverlay renders at showdown phase
- Full integration: settings → playing → showdown flow works

**Commit:** `feat(strategy-desk): compose full stage layout, remove PokerTable monolith`

---

## Task 7: Polish Showdown, Feedback + Micro-Interactions

**Goal:** Style the showdown overlay, add transitions for card dealing, board reveals, seat actions. Apply the Strategy Desk brass/ivory palette to all remaining raw elements.

**Files:**
- Create or modify: `src/components/game/ShowdownOverlay.tsx` (extract from PokerTable)
- Modify: `src/components/game/SeatCard.tsx` — add fold/all-in transitions
- Modify: `src/components/game/BoardCenter.tsx` — add card reveal animation
- Modify: `src/components/game/PlayingCard.tsx` — add fade-in for new cards
- Create: `src/components/game/__tests__/ShowdownOverlay.test.tsx`

**ShowdownOverlay redesign:**
- Background: `var(--sd-surface)` with 80% opacity, `backdrop-blur-sm`
- Winner text uses `--sd-brass` color
- "View Analysis" button: `--sd-brass` filled bg
- "Next Hand" button: subtle `--sd-surface` outline

**Micro-interactions:**
- Cards fade in with `animate-in fade-in duration-200` when dealt
- Folded seats transition to 40% opacity over 200ms
- All-in badge pulses subtly
- Activity ribbon fades in/out with 150ms transition

**Tests:**
- ShowdownOverlay renders winner name and hand description
- ShowdownOverlay "View Analysis" button calls `viewAnalysis`
- ShowdownOverlay "Next Hand" button calls `startHand` + `processAITurns`

**Commit:** `feat(strategy-desk): polish showdown, add micro-interactions and transitions`

---

## Task 8: Accessibility + Regression Hardening

**Goal:** Ensure all new components meet WCAG AA, have proper ARIA labels, and all existing tests still pass.

**Files:**
- Create: `src/components/game/__tests__/gameplay-accessibility.test.tsx`
- Modify: any components missing aria-labels or keyboard navigation

**Checks:**
- All interactive elements have `aria-label` or visible text
- `role="status"` and `aria-live="polite"` on ActivityRibbon
- `aria-label` on all action buttons in HeroDock
- `aria-label` on raise slider
- Focus rings use `focus-visible:ring-2 focus-visible:ring-[var(--sd-brass)]` consistently
- Keyboard navigation: Tab through HeroDock buttons, Enter to activate
- Screen reader: pot amount, community cards, player info all announced correctly
- Color contrast: all text meets 4.5:1 against backgrounds

**Regression:**
- Run full test suite: `npx vitest run`
- Run build: `npx tsc -b`
- Verify all 319+ tests pass
- No TypeScript errors

**Tests:**
- All HeroDock buttons have aria-labels
- ActivityRibbon has role="status" and aria-live="polite"
- CoachPanel hint button is keyboard accessible
- SeatCard has descriptive aria-label with player info

**Commit:** `feat(strategy-desk): add accessibility landmarks and regression hardening`

---

## Task 9: Final Cleanup + Dead Code Removal

**Goal:** Remove all replaced components, clean up unused imports, ensure build is clean.

**Files:**
- Delete or gut: `src/components/game/ActionToast.tsx` (replaced by ActivityRibbon)
- Delete or gut: `src/components/game/ActionButton.tsx` (replaced by HeroDock inline buttons)
- Delete or gut: `src/components/game/ActionControls.tsx` (replaced by HeroDock)
- Delete or gut: `src/components/game/HintPanel.tsx` (replaced by CoachPanel)
- Delete or gut: `src/components/game/TableHUD.tsx` (replaced by CoachPanel)
- Delete or gut: `src/components/game/PotDisplay.tsx` (replaced by BoardCenter)
- Delete or gut: `src/components/game/PlayerSeat.tsx` (replaced by SeatCard)
- Delete or gut: `src/components/game/PlayerProfile.tsx` (replaced by SeatCard)
- Clean up `PokerTable.tsx` — either delete entirely or keep only as re-export
- Remove any now-unused imports throughout the codebase

**Verification:**
```bash
npx tsc -b && npx vitest run
```

Must be zero TypeScript errors, zero test failures.

**Tests:** No new tests — this is cleanup. All existing tests must pass.

**Commit:** `feat(strategy-desk): remove replaced components, clean dead code`

---

## Post-Implementation

After all 9 tasks pass:
1. Run `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` to verify scope
2. Use `finishing-a-development-branch` skill to merge into main
3. Push to origin
