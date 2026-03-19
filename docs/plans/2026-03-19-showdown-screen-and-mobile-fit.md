# Showdown Screen & Mobile Viewport Fit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a proper showdown result screen that reveals all remaining players' cards on the table, and fix the mobile layout so the game fits in one screen without scrolling.

**Architecture:** Two independent changes: (1) Keep PokerTable mounted during showdown phase with a winner overlay replacing ActionControls, and skip showdown when everyone folds; (2) Constrain the game layout to `100dvh` with flex-based sizing so the table + controls never overflow the viewport.

**Tech Stack:** React, TypeScript, Tailwind CSS v4, Zustand

---

### Task 1: Store — Skip showdown on fold-out, add winnerHand to state

**Files:**
- Modify: `src/store/gameStore.ts:102-132` (StoreState type), `src/store/gameStore.ts:338-364` (fold-out win), `src/store/gameStore.ts:593-599` (resolveShowdown set)
- Modify: `src/types/poker.ts` (no changes needed — winnerHand already on HandHistory)

**Step 1: Add `winnerHand` to store state and pass it through**

In `src/store/gameStore.ts`, add `winnerHand?: string` to the `StoreState` interface alongside `winner`:

```typescript
// In StoreState interface (~line 116-117), add:
winnerHand?: string;
```

In the initial state (~line 149), add:

```typescript
winnerHand: undefined,
```

In `resolveShowdown` where the state is set (~line 593-599), also set `winnerHand`:

```typescript
set({
  players: updatedPlayers,
  pot: 0,
  gamePhase: 'showdown',
  winner: bestContenders[0].player.id,
  winnerHand: bestEval.description,
  handHistory: [...state.handHistory, handHistoryEntry],
});
```

Also set `winnerHand` in the early-exit path of `resolveShowdown` (~line 533-540):

```typescript
set({
  players: updatedPlayers,
  pot: 0,
  gamePhase: 'showdown',
  winner: winner.player.id,
  winnerHand: undefined,
  handHistory: [...state.handHistory, handHistoryEntry],
});
```

Clear `winnerHand` in `startHand` (~line 275-276):

```typescript
winnerHand: undefined,
```

Clear `winnerHand` in `resetGame` (~line 636):

```typescript
winnerHand: undefined,
```

**Step 2: Make fold-out wins skip showdown and go directly to analysis**

In `performAction`, the fold-out win block (~lines 338-364) currently sets `gamePhase: 'showdown'`. Change it to automatically run `viewAnalysis` instead:

```typescript
// In the fold-out win block (activePlayers === 1), change:
// gamePhase: 'showdown',
// to:
// gamePhase: 'showdown', (keep this — viewAnalysis requires it)

// Then AFTER the set() call, immediately call viewAnalysis:
set({
  players: updatedPlayers,
  pot: 0,
  actions: updatedActions,
  gamePhase: 'showdown',
  winner: winner.id,
  winnerHand: undefined,
  handHistory: [...state.handHistory, handHistoryEntry],
});
// Skip showdown screen when everyone folded — go straight to analysis
get().viewAnalysis();
return;
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Clean build, zero errors

**Step 4: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat: skip showdown on fold-out, add winnerHand to store state"
```

---

### Task 2: App.tsx — Render PokerTable during showdown, remove ShowdownView

**Files:**
- Modify: `src/App.tsx`

**Step 1: Remove the `ShowdownView` component and render `PokerTable` for both `'playing'` and `'showdown'` phases**

Replace the entire `src/App.tsx` with:

```tsx
import { AppShell } from './components/layout/AppShell';
import { GameSettings } from './components/settings/GameSettings';
import { PokerTable } from './components/game/PokerTable';
import { AnalysisDashboard } from './components/analysis/AnalysisDashboard';
import { useGameStore } from './store/gameStore';

function App() {
  const gamePhase = useGameStore((s) => s.gamePhase);

  return (
    <AppShell>
      {gamePhase === 'settings' && <GameSettings />}
      {(gamePhase === 'playing' || gamePhase === 'showdown') && <PokerTable />}
      {gamePhase === 'analysis' && <AnalysisDashboard />}
    </AppShell>
  );
}

export default App;
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Clean build

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: render PokerTable during showdown phase, remove ShowdownView"
```

---

### Task 3: PokerTable — Add showdown overlay with winner info and actions

**Files:**
- Modify: `src/components/game/PokerTable.tsx`

**Step 1: Add showdown overlay to PokerTable**

Import `useGameStore` selectors for `gamePhase`, `winner`, `winnerHand`, `viewAnalysis`, `startHand`, and `processAITurns`. Show a showdown overlay at the bottom (replacing `ActionControls`) when `gamePhase === 'showdown'`.

```tsx
import { useGameStore } from '../../store/gameStore';
import { PlayerSeat } from './PlayerSeat';
import { CommunityCards } from './CommunityCards';
import { PotDisplay } from './PotDisplay';
import { ActionControls } from './ActionControls';

// ── Seat Positions (keep existing code) ──

// ... getSeatPositions function unchanged ...

// ── Showdown Overlay ────────────────────────────────────────────────

function ShowdownOverlay() {
  const winner = useGameStore((s) => s.winner);
  const winnerHand = useGameStore((s) => s.winnerHand);
  const players = useGameStore((s) => s.players);
  const viewAnalysis = useGameStore((s) => s.viewAnalysis);
  const startHand = useGameStore((s) => s.startHand);
  const processAITurns = useGameStore((s) => s.processAITurns);

  const winnerPlayer = players.find((p) => p.id === winner);

  const handleNextHand = () => {
    startHand();
    processAITurns();
  };

  return (
    <div className="w-full bg-slate-900 border-t border-slate-700 p-4 pb-[env(safe-area-inset-bottom,16px)] flex-shrink-0">
      {/* Winner announcement */}
      <div className="text-center mb-4">
        <h3 className="text-emerald-400 font-bold text-lg">
          {winnerPlayer?.name ?? 'Unknown'} wins!
        </h3>
        {winnerHand && (
          <p className="text-slate-400 text-sm">{winnerHand}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        <button
          onClick={viewAnalysis}
          className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-6 rounded-lg font-bold text-lg transition-colors min-h-[48px]"
        >
          View Analysis
        </button>
        <button
          onClick={handleNextHand}
          className="bg-slate-700 hover:bg-slate-600 text-white py-3 px-6 rounded-lg font-bold text-lg transition-colors min-h-[48px]"
        >
          Next Hand
        </button>
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────

export function PokerTable() {
  const players = useGameStore((s) => s.players);
  const communityCards = useGameStore((s) => s.communityCards);
  const pot = useGameStore((s) => s.pot);
  const currentRound = useGameStore((s) => s.currentRound);
  const activePlayerIndex = useGameStore((s) => s.activePlayerIndex);
  const dealerIndex = useGameStore((s) => s.dealerIndex);
  const gamePhase = useGameStore((s) => s.gamePhase);

  const seatPositions = getSeatPositions(players.length);
  const isShowdown = gamePhase === 'showdown';

  return (
    <div className="flex flex-col h-full">
      {/* Table area */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <div
          className="
            relative w-full max-w-3xl aspect-[16/10]
            bg-slate-950 border-4 border-slate-700
            rounded-[60px] md:rounded-[100px]
            flex flex-col items-center justify-center gap-3
          "
        >
          {/* Player seats */}
          {players.map((player, i) => (
            <PlayerSeat
              key={player.id}
              player={player}
              isActive={!isShowdown && i === activePlayerIndex}
              isDealer={i === dealerIndex}
              position={seatPositions[i] ?? 'top'}
            />
          ))}

          {/* Community cards */}
          <CommunityCards cards={communityCards} round={currentRound} />

          {/* Pot — show during showdown too so players see the amount won */}
          <PotDisplay pot={pot} />
        </div>
      </div>

      {/* Bottom area: action controls during play, showdown overlay during showdown */}
      {isShowdown ? <ShowdownOverlay /> : <ActionControls />}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Clean build

**Step 3: Commit**

```bash
git add src/components/game/PokerTable.tsx
git commit -m "feat: add showdown overlay with winner info, replacing ActionControls"
```

---

### Task 4: PlayerSeat — Highlight winner during showdown

**Files:**
- Modify: `src/components/game/PlayerSeat.tsx`

**Step 1: Add winner highlight ring**

Import `winner` from the store. When `gamePhase === 'showdown'` and the player is the winner, add a green glow ring. Also dim folded players more visibly during showdown.

In the component function, add:

```typescript
const winner = useGameStore((s) => s.winner);
const isWinner = gamePhase === 'showdown' && player.id === winner;
```

Update the border/ring classes on the card container (~line 82-87):

```typescript
className={`
  relative flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-800 border
  ${isWinner ? 'ring-2 ring-emerald-400 border-emerald-500 shadow-lg shadow-emerald-500/30' : ''}
  ${isActive && !isWinner ? 'ring-2 ring-emerald-400 border-emerald-500' : ''}
  ${!isActive && !isWinner ? 'border-slate-600' : ''}
  ${isFolded ? 'opacity-40' : ''}
  min-w-[120px]
`}
```

Note: during showdown, `isActive` is always `false` (Task 3 sets it to `!isShowdown && i === activePlayerIndex`), so only the winner gets the ring.

**Step 2: Verify build**

Run: `npm run build`
Expected: Clean build

**Step 3: Commit**

```bash
git add src/components/game/PlayerSeat.tsx
git commit -m "feat: highlight winner with green glow during showdown"
```

---

### Task 5: Mobile viewport fit — AppShell and PokerTable sizing

**Files:**
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/components/game/PokerTable.tsx`
- Modify: `src/components/game/ActionControls.tsx`
- Modify: `src/components/game/PlayerSeat.tsx`

**Step 1: AppShell — use `h-dvh` for game phases, keep scrollable for others**

The game phases (`playing`, `showdown`) need to be locked to viewport height. Settings and analysis should remain scrollable.

```tsx
import { useGameStore } from '../../store/gameStore';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const handNumber = useGameStore((s) => s.handNumber);
  const resetGame = useGameStore((s) => s.resetGame);

  const isGameView = gamePhase === 'playing' || gamePhase === 'showdown';

  return (
    <div className={`flex flex-col bg-slate-900 text-slate-100 ${isGameView ? 'h-dvh overflow-hidden' : 'min-h-dvh'}`}>
      <nav className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex flex-row items-center justify-between flex-shrink-0">
        <span className="text-emerald-400 font-bold text-lg">PPA</span>

        {gamePhase !== 'settings' && (
          <div className="flex items-center gap-4">
            <span className="text-slate-300 text-sm">Hand #{handNumber}</span>
            <button
              onClick={resetGame}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
            >
              New Game
            </button>
          </div>
        )}
      </nav>

      <main className={`flex-1 ${isGameView ? 'min-h-0' : 'overflow-auto'}`}>{children}</main>
    </div>
  );
}
```

Key changes:
- `h-dvh overflow-hidden` during game (locks to viewport)
- `min-h-dvh` for settings/analysis (allows scrolling)
- Nav gets `flex-shrink-0` so it never compresses
- Nav padding reduced from `py-3` to `py-2` to save vertical space on mobile
- Removed `min-h-[48px]` from nav
- Main gets `min-h-0` during game (allows flex children to shrink below content size)

**Step 2: PokerTable — make table area shrink to fit**

In `src/components/game/PokerTable.tsx`, the table area div needs `min-h-0` so it can shrink, and reduce padding on mobile:

Change the table area div from:
```
<div className="flex-1 flex items-center justify-center p-4 min-h-0">
```
to:
```
<div className="flex-1 flex items-center justify-center p-2 md:p-4 min-h-0">
```

The table felt div: keep `aspect-[16/10]` but add `max-h-full` so it respects the parent's height constraint:

Change from:
```
relative w-full max-w-3xl aspect-[16/10]
```
to:
```
relative w-full max-w-3xl aspect-[16/10] max-h-full
```

**Step 3: ActionControls — add flex-shrink-0**

In `src/components/game/ActionControls.tsx`, the root div needs `flex-shrink-0`:

Change line 80 from:
```tsx
<div className="w-full bg-slate-900 border-t border-slate-700 p-4 pb-[env(safe-area-inset-bottom,16px)]">
```
to:
```tsx
<div className="w-full bg-slate-900 border-t border-slate-700 p-3 pb-[env(safe-area-inset-bottom,12px)] flex-shrink-0">
```

(Also reduced padding from `p-4` to `p-3` and bottom safe-area fallback from `16px` to `12px` to save space.)

**Step 4: PlayerSeat — scale down on mobile**

The seats are `min-w-[120px]` with `p-3` padding and `w-12 h-16` cards. On small screens this is too large. Add responsive sizing:

In `PlayerSeat.tsx`, change the seat container min-width:
```
min-w-[120px]
```
to:
```
min-w-[90px] md:min-w-[120px]
```

Change padding:
```
p-3
```
to:
```
p-1.5 md:p-3
```

In `CardDisplay`, change card size from `w-12 h-16` to `w-8 h-11 md:w-12 md:h-16` for both the face-up and face-down variants. Also scale down the text:

Face-down card:
```tsx
<div className="w-8 h-11 md:w-12 md:h-16 bg-slate-600 rounded-lg border border-slate-500 flex items-center justify-center">
  <span className="text-slate-400 text-xs">🂠</span>
</div>
```

Face-up card:
```tsx
<div
  className={`w-8 h-11 md:w-12 md:h-16 bg-white rounded-lg border border-slate-300 flex flex-col items-center justify-center ${color}`}
>
  <span className="text-xs md:text-sm font-bold">{card.rank}</span>
  <span className="text-sm md:text-lg">{suitSymbol(card.suit)}</span>
</div>
```

Also scale down player name text and stack text:
- Name: `text-sm` → `text-xs md:text-sm`
- Stack: `text-sm` → `text-xs md:text-sm`

**Step 5: Verify build**

Run: `npm run build`
Expected: Clean build

**Step 6: Commit**

```bash
git add src/components/layout/AppShell.tsx src/components/game/PokerTable.tsx src/components/game/ActionControls.tsx src/components/game/PlayerSeat.tsx
git commit -m "fix: constrain game layout to viewport height on mobile"
```

---

### Task 6: Final verification

**Step 1: Full build check**

Run: `npm run build`
Expected: Clean build, zero errors

**Step 2: Visual spot check**

Run: `npm run dev`
Manually verify:
- Start a game, play to showdown — all non-folded players' cards are revealed, winner has green glow
- Winner name + hand description shown in bottom overlay
- "View Analysis" and "Next Hand" buttons work
- When everyone folds, it skips straight to analysis
- On mobile viewport (Chrome DevTools: iPhone SE or similar), the game fits in one screen without scrolling
- Action buttons remain visible without scrolling
- Cards and seats are readable at mobile sizes

**Step 3: Commit (if any final tweaks needed)**

```bash
git commit -m "chore: final adjustments for showdown screen and mobile fit"
```
