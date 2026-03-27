# Strategy Desk — Live Table Redesign Design Document

## Vision

Transform the poker table gameplay surface from an amateur-feeling prototype into a professional **GTO coaching workstation**. The table should feel like poker first, and the coaching should feel adjacent — never obstructive.

**Positioning**: "Strategy Desk" — calm, credible, high-end coaching tool. Not a flashy casino. Not a cold solver terminal.

---

## Design Direction

### Visual Language

| Token | Value | Usage |
|-------|-------|-------|
| `--sd-bg` | `#121214` | Page background (warm graphite) |
| `--sd-surface` | `#1c1c20` | Panels, docks, rails |
| `--sd-felt` | `#1a3a2a` | Table felt (deep forest) |
| `--sd-felt-edge` | `#0f2a1e` | Felt gradient edge |
| `--sd-rail` | `#2a2a2e` | Table rail |
| `--sd-rail-highlight` | `#3a3a3e` | Rail top gradient |
| `--sd-smoke` | `rgba(255,255,255,0.06)` | Dividers, subtle borders |
| `--sd-brass` | `#c9a94e` | Accent (dealer btn, pot, active ring) |
| `--sd-brass-muted` | `#a08838` | Secondary accent |
| `--sd-ivory` | `#f5f0e8` | Primary text on dark |
| `--sd-fold` | `#dc4a4a` | Fold action |
| `--sd-check` | `#4adc7a` | Check/call action |
| `--sd-raise` | `#4a9adc` | Raise/bet action |
| `--sd-allin` | `#dc8a4a` | All-in action |

### Typography

| Role | Font | Fallback |
|------|------|----------|
| Headings/labels | `Space Grotesk` | `system-ui, sans-serif` |
| UI text | `IBM Plex Sans` | `system-ui, sans-serif` |
| Monospace (stacks, pot, EV) | `IBM Plex Mono` | `ui-monospace, monospace` |

Fonts loaded via Google Fonts link in `index.html`.

### Materials

- **Matte surfaces** everywhere — no glossy gradients
- **Glass** only for the coach panel rail and activity ribbon background (subtle `backdrop-blur-sm`)
- **Shadows** are sparse and soft — `shadow-lg` max, never harsh drop shadows
- **Borders** use `--sd-smoke` (6% white) — barely visible dividers

---

## Sacred Rules

1. **No overlay may cover community cards, pot, or active-board context.** The board must remain readable at all times.
2. **The hero dock is always visible and positionally stable** when it's the hero's turn. No layout shifts when hint panel opens/closes.
3. **AI action feedback lives in a dedicated ribbon** — never a centered toast over the board.
4. **Coaching is a side surface** (desktop rail / mobile bottom sheet), not scattered across multiple small overlays.

---

## Layout Architecture

### Desktop (>=768px)

```
┌─────────────────────────────────────────────────────────┐
│  GameTopBar  [hand #] [street] [blinds]  [settings gear]│
├──────────────────────────────────────┬──────────────────┤
│                                      │                  │
│          TABLE STAGE                 │   COACH PANEL    │
│   ┌──────────────────────────┐      │   (right rail)   │
│   │      seats around        │      │                  │
│   │    ┌──────────────┐     │      │  - GTO Hint      │
│   │    │ BoardCenter   │     │      │  - Pot Odds      │
│   │    │ pot + cards   │     │      │  - SPR           │
│   │    │ + ribbon      │     │      │  - Equity        │
│   │    └──────────────┘     │      │                  │
│   └──────────────────────────┘      │                  │
│                                      │                  │
├──────────────────────────────────────┴──────────────────┤
│  HERO DOCK  [fold] [check/call] [raise ▸] [all-in]     │
│             [raise slider when expanded]                │
└─────────────────────────────────────────────────────────┘
```

### Mobile (<768px)

```
┌─────────────────────────────┐
│ GameTopBar [hand] [street]  │
├─────────────────────────────┤
│                             │
│       TABLE STAGE           │
│    seats + BoardCenter      │
│    (protected, never        │
│     covered by overlays)    │
│                             │
├─────────────────────────────┤
│ HERO DOCK                   │
│ [fold] [check/call]        │
│ [raise] [all-in]           │
│ [raise slider if expanded] │
├─────────────────────────────┤
│ COACH SHEET (collapsible)  │
│ [Show Hint ▸]              │
└─────────────────────────────┘
```

---

## Component Architecture

### New Components

| Component | File | Responsibility |
|-----------|------|----------------|
| `TableShell` | `src/components/game/TableShell.tsx` | Full-page gameplay frame. Manages desktop (table + coach rail) vs mobile (stacked) layout. Renders `GameTopBar`, table stage, `HeroDock`, `CoachPanel`. |
| `GameTopBar` | `src/components/game/GameTopBar.tsx` | Persistent top bar: hand number, street label, blind level, settings/exit button. |
| `BoardCenter` | `src/components/game/BoardCenter.tsx` | Unified center of table: pot display + community cards + street label + activity ribbon. Replaces `PotDisplay` + `CommunityCards` + `TableHUD` + `ActionToast` in the table center. |
| `ActivityRibbon` | `src/components/game/ActivityRibbon.tsx` | Horizontal ribbon below community cards showing the last AI action. Replaces `ActionToast`. Never covers the board. |
| `SeatRing` | `src/components/game/SeatRing.tsx` | Positions seats around the table oval using CSS trigonometric functions for any player count 2-6. Replaces the `getSeatLayouts` switch-case. |
| `SeatCard` | `src/components/game/SeatCard.tsx` | Unified seat display: avatar area, cards, name, stack, position tag, dealer button, bet chip, status. Replaces both `PlayerProfile` and `PlayerSeat`. |
| `HeroDock` | `src/components/game/HeroDock.tsx` | Stable bottom command bar: fold, check/call, raise, all-in buttons with strong visual hierarchy. Replaces `ActionControls`. |
| `RaiseControls` | `src/components/game/RaiseControls.tsx` | Extracted raise slider + preset chips. Rendered inside `HeroDock` when raise is active. |
| `CoachPanel` | `src/components/game/CoachPanel.tsx` | Desktop: fixed right rail. Mobile: collapsible bottom sheet. Contains GTO hint, pot odds, SPR, equity. Replaces `HintPanel` + `TableHUD`. |

### Modified Components

| Component | Change |
|-----------|--------|
| `PlayingCard` | New visual style: white/cream face with colored suit symbols (classic 2-color), cleaner borders, slightly larger |
| `index.css` | Replace `.poker-table-bg` grid pattern with Strategy Desk tokens, add font imports |
| `index.html` | Add Google Fonts link for Space Grotesk, IBM Plex Sans, IBM Plex Mono |
| `LiveTablePage` | Switch from `PokerTable` to `TableShell` |

### Removed Components (after migration)

| Component | Replaced By |
|-----------|-------------|
| `ActionToast` | `ActivityRibbon` |
| `TableHUD` | `CoachPanel` (absorbs pot odds + SPR) |
| `HintPanel` | `CoachPanel` (absorbs GTO hint) |
| `ActionControls` | `HeroDock` + `RaiseControls` |
| `ActionButton` | Inline styled buttons in `HeroDock` with proper hierarchy |
| `PlayerProfile` | `SeatCard` |
| `PlayerSeat` | `SeatCard` (was already unused by PokerTable) |
| `PotDisplay` | `BoardCenter` (absorbs pot display) |

---

## Seat Layout System

The current `getSeatLayouts()` uses a giant switch-case with hand-tuned magic percentages for each player count. Replace with trigonometric positioning:

```
For N seats, seat i (0 = hero at bottom center):
  angle = π/2 + (2π * i / N)  // start from bottom (π/2)
  x = 50% + rx * cos(angle)
  y = 50% - ry * sin(angle)
```

Where `rx` and `ry` define the elliptical radius (e.g., 42% and 38% of container).

Hero (seat 0) is always at the bottom. Opponents distribute evenly around the top arc.

---

## Card Visual Upgrade

Current cards use 4-color deck with solid color backgrounds (red-600, blue-600, green-600, neutral-900). This looks toy-like.

New cards:
- White/cream face (`--sd-ivory` tinted)
- Classic 2-color: red for hearts/diamonds, dark for spades/clubs
- Cleaner rounded corners, subtle shadow
- Rank and suit symbols in corners (classic card layout)
- Slightly larger for readability

---

## Hero Dock Design

The action bar must have clear visual hierarchy:

| Button | Style | Priority |
|--------|-------|----------|
| Fold | `--sd-fold` outline, subtle | Low — destructive but not primary |
| Check/Call | `--sd-check` filled | Medium — safe default |
| Raise | `--sd-raise` filled, prominent | High — most strategic action |
| All-in | `--sd-allin` outline | Special — dramatic but not default |

Raise button opens the `RaiseControls` panel inline (slides up within the dock). Preset chips: 1/3 pot, 1/2 pot, 3/4 pot, pot, all-in.

---

## Showdown Overlay

The showdown CTA (View Analysis / Next Hand) remains at the bottom of the table area but gets the Strategy Desk treatment:
- Uses `--sd-surface` background with `--sd-brass` accent for the primary CTA
- Winner announcement uses `--sd-brass` color instead of emerald
- Cards reveal with a brief fade transition

---

## Coaching Integration

Currently coaching is split across 3 surfaces:
1. `HintPanel` — GTO hint slide-up in the action bar
2. `TableHUD` — pot odds + SPR badges in the board center
3. `ActionToast` — AI action notification over the board

Consolidate into `CoachPanel`:
- **Desktop**: 280px-wide right rail, always visible
- **Mobile**: collapsible bottom sheet below hero dock, "Show Coach" toggle
- Contains: GTO hint, pot odds, SPR, equity (when applicable)
- AI action feedback moves to `ActivityRibbon` (inside `BoardCenter`, below cards)

---

## Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| < 768px | Mobile: stacked vertical, no coach rail, coach is bottom sheet |
| >= 768px | Desktop: table stage + coach rail side-by-side, hero dock full width |

Using Tailwind's `md:` prefix for the breakpoint.
