# Mobile Responsive Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix mobile layout so player seats, cards, and controls don't overlap or overflow on phone screens (portrait and landscape).

**Architecture:** Replace fixed Tailwind offset classes on player seats with percentage-based inline styles that scale proportionally with the table container. Also make community cards responsive and remove the fixed aspect ratio on mobile.

**Tech Stack:** React, TypeScript, Tailwind CSS v4

**Design doc:** `docs/plans/2026-03-19-mobile-responsive-layout-design.md`

---

### Task 1: Convert PlayerSeat to percentage-based positioning

**Files:**
- Modify: `src/components/game/PlayerSeat.tsx`

**Step 1: Replace POSITION_CLASSES with POSITION_COORDS**

Replace the `POSITION_CLASSES` constant (lines 48-58) with a coordinate map:

```tsx
const POSITION_COORDS: Record<SeatPosition, { top: string; left: string }> = {
    top:            { top: "2%",  left: "50%" },
    bottom:         { top: "95%", left: "50%" },
    left:           { top: "50%", left: "3%" },
    right:          { top: "50%", left: "97%" },
    "top-left":     { top: "15%", left: "15%" },
    "top-right":    { top: "15%", left: "85%" },
    "bottom-left":  { top: "82%", left: "15%" },
    "bottom-right": { top: "82%", left: "85%" },
    "left-top":     { top: "33%", left: "5%" },
};
```

**Step 2: Update the PlayerSeat component's outer div**

Change line 94 from:
```tsx
<div className={`${POSITION_CLASSES[position]} z-10`}>
```
to:
```tsx
<div
    className="absolute z-10"
    style={{
        top: POSITION_COORDS[position].top,
        left: POSITION_COORDS[position].left,
        transform: "translate(-50%, -50%)",
    }}
>
```

**Step 3: Run build to verify no errors**

Run: `npm run build`
Expected: Build succeeds with zero TypeScript errors.

**Step 4: Commit**

```bash
git add src/components/game/PlayerSeat.tsx
git commit -m "fix: use percentage-based positioning for player seats"
```

---

### Task 2: Make table container responsive

**Files:**
- Modify: `src/components/game/PokerTable.tsx`

**Step 1: Update table container classes**

Change the table felt div (lines 141-146) from:
```tsx
className="
    relative w-full max-w-3xl aspect-[16/10] max-h-full
    bg-slate-950 border-4 border-slate-700
    rounded-[60px] md:rounded-[100px]
    flex flex-col items-center justify-center gap-3
"
```
to:
```tsx
className="
    relative w-full max-w-3xl h-full md:aspect-[16/10] md:h-auto md:max-h-full
    bg-slate-950 border-4 border-slate-700
    rounded-[60px] md:rounded-[100px]
    flex flex-col items-center justify-center gap-2 md:gap-3
    overflow-visible
"
```

Key changes:
- Mobile: `h-full` (fills available space) instead of `aspect-[16/10]` which made it too short in portrait
- Desktop: `md:aspect-[16/10] md:h-auto md:max-h-full` preserves the current desktop behavior
- `overflow-visible` so edge seats can bleed slightly outside the felt border
- `gap-2 md:gap-3` slightly tighter on mobile

**Step 2: Run build to verify no errors**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/game/PokerTable.tsx
git commit -m "fix: make table container responsive for mobile viewports"
```

---

### Task 3: Make community cards responsive

**Files:**
- Modify: `src/components/game/CommunityCards.tsx`

**Step 1: Add responsive sizing to community cards**

Change the `CommunityCardDisplay` card div (line 21-22) from:
```tsx
className={`w-14 h-20 bg-white rounded-lg border border-slate-300 flex flex-col items-center justify-center ${color}`}
```
to:
```tsx
className={`w-10 h-14 md:w-14 md:h-20 bg-white rounded-lg border border-slate-300 flex flex-col items-center justify-center ${color}`}
```

Change the text sizes inside from:
```tsx
<span className="text-base font-bold">{card.rank}</span>
<span className="text-xl">{suitSymbol(card.suit)}</span>
```
to:
```tsx
<span className="text-sm md:text-base font-bold">{card.rank}</span>
<span className="text-base md:text-xl">{suitSymbol(card.suit)}</span>
```

Change the `EmptyCardSlot` (line 32) from:
```tsx
className="w-14 h-20 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center"
```
to:
```tsx
className="w-10 h-14 md:w-14 md:h-20 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center"
```

Also reduce the gap between cards on mobile (line 54):
```tsx
<div className="flex justify-center items-center gap-1 md:gap-2">
```

**Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/components/game/CommunityCards.tsx
git commit -m "fix: make community cards responsive for mobile screens"
```

---

### Task 4: Visual verification and fine-tuning

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Test in browser with device emulation**

Open browser DevTools, toggle device toolbar, test with:
- iPhone SE (375x667) portrait
- iPhone SE landscape (667x375)
- iPhone 14 Pro (393x852) portrait
- iPhone 14 Pro landscape (852x393)
- iPad Mini (768x1024)

Check for:
- No seat overlap with 2, 5, 7, and 9 players
- Hero seat visible at bottom, not cut off by ActionControls
- Community cards centered and readable
- Pot display visible
- ActionControls buttons fully visible and tappable
- Showdown overlay not cut off

**Step 3: Adjust coordinates if needed**

Fine-tune `POSITION_COORDS` percentages based on visual testing. Likely adjustments:
- Hero `bottom` may need to move up if ActionControls covers it
- Edge seats (`left`, `right`) may need coordinates adjusted if they clip the rounded corners

**Step 4: Final build check**

Run: `npm run build`
Expected: Build succeeds.

**Step 5: Commit any fine-tuning**

```bash
git add -A
git commit -m "fix: fine-tune mobile seat positions after visual testing"
```
