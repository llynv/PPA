# Poker Practice App (PPA) — Design Document

**Date:** 2026-03-19
**Status:** Approved

## Overview

A single-player Texas Hold'em practice tool where the user (Hero) plays against 1-8 AI opponents. After each hand, the user reviews a detailed GTO-inspired analysis dashboard showing mistakes, optimal frequencies, and EV loss.

## Decisions

| Decision         | Choice                       | Rationale                                                           |
| ---------------- | ---------------------------- | ------------------------------------------------------------------- |
| Framework        | React + Vite                 | Client-side SPA, no backend needed. Vite is faster and simpler.     |
| State Management | Zustand                      | Lightweight, minimal boilerplate, good for complex game state.      |
| Architecture     | Monolithic store with slices | Single source of truth, hand history captured as state transitions. |
| AI Simulation    | Simple rule-based            | Real card dealing, weighted AI decisions, mock GTO analysis.        |
| Charting         | Recharts                     | React-native, responsive, good for bar/line charts.                 |
| Styling          | Tailwind CSS                 | Dark mode default, utility-first, responsive.                       |
| Icons            | Lucide React                 | Clean, consistent icon set.                                         |

## Tech Stack

- React 18+ with TypeScript
- Vite (build tool)
- Tailwind CSS (dark mode default)
- Zustand (state management)
- Recharts (data visualization)
- Lucide React (icons)

## Data Model

### Core Types

```typescript
Card: { suit: 'hearts'|'diamonds'|'clubs'|'spades', rank: '2'..'A' }
Player: { id, name, stack, holeCards, isDealer, isFolded, currentBet, isHero, personality? }
BettingRound: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'
Action: { playerId, type: 'fold'|'check'|'call'|'bet'|'raise', amount?, round, timestamp }
GameState: { players[], deck[], communityCards[], pot, currentRound, actions[], activePlayerId, blinds, handNumber, gamePhase }
HandHistory: completed hand snapshot (all actions, board, hole cards, winner, pot won)
AnalysisData: { heroGrade, decisions[], evLoss, mistakes[] }
Decision: { round, heroAction, optimalAction, optimalFrequencies: {fold, call, raise}, evDiff }
```

## Project Structure

```
src/
├── types/
│   └── poker.ts            # All TypeScript interfaces
├── lib/
│   ├── deck.ts             # Shuffle, deal, card utilities
│   ├── ai.ts               # Rule-based AI logic (with personality variants)
│   ├── evaluator.ts        # Hand strength evaluator
│   └── analysis.ts         # Mock GTO analysis generator
├── store/
│   └── gameStore.ts        # Zustand store (game + hand history)
├── components/
│   ├── layout/
│   │   └── AppShell.tsx    # Nav bar + mode toggle + responsive container
│   ├── game/
│   │   ├── PokerTable.tsx      # Table felt, responsive seat arrangement
│   │   ├── PlayerSeat.tsx      # Cards, stack, name, dealer button
│   │   ├── CommunityCards.tsx  # Board cards
│   │   ├── PotDisplay.tsx      # Current pot
│   │   └── ActionControls.tsx  # Fold/Call/Raise + slider + presets
│   ├── analysis/
│   │   ├── AnalysisDashboard.tsx  # Main analysis view
│   │   ├── HeroGrade.tsx          # Circular gauge A+ to F
│   │   ├── HandTimeline.tsx       # Step-by-step hand replay
│   │   ├── DecisionChart.tsx      # Bar chart of action frequencies
│   │   ├── MistakeCard.tsx        # Individual mistake feedback
│   │   └── EVTracker.tsx          # Cumulative EV line chart
│   └── settings/
│       └── GameSettings.tsx   # Player count, blind levels, stack sizes
├── App.tsx
└── main.tsx
```

## Game Flow

1. **Settings** — Choose number of opponents (1-8), blind levels, starting stack
2. **Start Hand** — Shuffle deck, assign blinds (rotating dealer), deal 2 cards each
3. **Preflop** — Blinds posted, action proceeds in turn order
4. **Flop/Turn/River** — Deal community cards, betting round (round-robin until all acted)
5. **Showdown** — Evaluate hands, award pot, push hand to history
6. **Analysis** — "View Analysis" button appears, transitions to analysis dashboard

### Key Rule: No GTO data visible during play

The play mode is clean — no hints, no frequencies, no color-coding of decisions. Analysis is revealed only after the hand ends.

## Multi-Player Support

- 2-9 total players (Hero + 1-8 AI opponents)
- Each AI has independent rule-based strategy with personality variation:
  - Tight-Aggressive (TAG): plays fewer hands, bets strong
  - Loose-Aggressive (LAG): plays more hands, bluffs more
  - Tight-Passive (rock): plays few hands, mostly calls
  - Loose-Passive (calling station): plays many hands, rarely raises
- Seats arranged dynamically around oval table based on player count
- Dealer button rotates through all players

## AI Strategy (Rule-Based)

- **Preflop**: Simplified range chart based on personality. Strong hands raise, medium call, weak fold. Random noise for variety.
- **Postflop**: Evaluates hand strength. Bets proportional to strength with personality-adjusted bluff frequency (5-20%). Calls with decent equity, folds weak to large bets.
- Intentionally beatable but not trivially exploitable.

## Mock GTO Analysis

When a hand completes:

- Compare hero's action at each decision point to a computed "optimal" action (hand strength + pot odds)
- Compute simplified EV difference
- Generate realistic optimal frequency distributions
- Grade hero A+ through F based on total EV loss
- Highlight specific mistakes with explanations

## Visual Design

### Color Palette

- **Backgrounds**: slate-900 (app), slate-950 (table felt), zinc-800 (cards/panels)
- **Accents**: emerald-500 (call/check, positive), red-500 (fold, mistakes), amber-500 (raise/bet), sky-500 (info)
- **Text**: slate-100 primary, slate-400 secondary
- **Cards**: White with suit-colored pips (red hearts/diamonds, dark clubs/spades)
- **Effects**: Subtle box-shadow glow on active elements

### Responsive Strategy

- **Mobile-first** with Tailwind breakpoints
- **Desktop (md+)**: Oval table with seats arranged around it
- **Mobile portrait**: Hero bottom, opponents arc at top, action controls fixed to bottom (min 44px touch targets)
- **Mobile landscape**: Compact desktop-like layout
- **Seat scaling**: 2 players = top/bottom; 3-4 = top/sides/bottom; 5-6 = evenly spaced; 7-9 = tight spacing, compact seats
- **Charts**: Recharts ResponsiveContainer for auto-resize

### Analysis Dashboard

Scrollable single-page with card-based sections:

1. **Hero's Grade** — Circular gauge with letter grade and EV loss number
2. **Hand Timeline** — Stepper (horizontal desktop, vertical mobile) with clickable street expansion
3. **Decision Charts** — Stacked bar charts per street showing optimal vs. hero frequencies
4. **Mistake Cards** — Expandable cards sorted by severity
5. **EV Tracker** — Line chart for cumulative EV across session
