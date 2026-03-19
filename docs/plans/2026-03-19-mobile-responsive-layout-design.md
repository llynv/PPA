# Mobile Responsive Layout Design

**Date:** 2026-03-19  
**Status:** Approved  

## Problem

Player seats use absolute positioning with fixed Tailwind spacing classes (`top-2`, `left-8`, `bottom-6`, etc.) inside an `aspect-[16/10]` container. On a phone in portrait mode (~375px wide), the table felt becomes roughly 375x234px, and the seats (90px wide each) with fixed offsets overlap each other and overflow the container. The layout must work in both portrait (~375x670) and landscape (~670x375).

## Approach

**Percentage-based positioning.** Replace fixed Tailwind offset classes with percentage-based `top`/`left` inline styles. Each `SeatPosition` maps to `{ top: string, left: string }` coordinates, with `transform: translate(-50%, -50%)` centering. The existing absolute positioning model stays; only the offset values change.

## Position Coordinate System

The table container is a 100% x 100% coordinate space. Each seat is centered on its coordinate point via `translate(-50%, -50%)`.

| Position       | top  | left | Description              |
|----------------|------|------|--------------------------|
| `top`          | 2%   | 50%  | Top center               |
| `bottom`       | 95%  | 50%  | Bottom center (Hero)     |
| `left`         | 50%  | 3%   | Left center              |
| `right`        | 50%  | 97%  | Right center             |
| `top-left`     | 15%  | 15%  | Upper-left corner        |
| `top-right`    | 15%  | 85%  | Upper-right corner       |
| `bottom-left`  | 82%  | 15%  | Lower-left corner        |
| `bottom-right` | 82%  | 85%  | Lower-right corner       |
| `left-top`     | 33%  | 5%   | Left side, upper third   |

## Seat Sizing

- Current mobile: `min-w-[90px]`, cards `w-8 h-11`
- For very small screens (< 400px): reduce to `min-w-[76px]`, cards `w-7 h-10`
- Seats at edges may bleed slightly outside the felt — this is acceptable with `overflow-visible`

## Table Container

- Remove fixed `aspect-[16/10]` on mobile — let the table fill available space
- Apply `md:aspect-[16/10]` only on medium+ screens
- Keep `overflow-visible` so edge seats can bleed slightly outside the felt border
- Rounded corners `rounded-[60px] md:rounded-[100px]` stay

## Files Changed

1. **`src/components/game/PlayerSeat.tsx`** — Replace `POSITION_CLASSES` with `POSITION_COORDS` map, apply as inline styles with translate centering
2. **`src/components/game/PokerTable.tsx`** — Adjust table container: responsive aspect ratio, overflow-visible

## Rejected Alternatives

- **CSS Grid/Flexbox rows:** Loses the oval-table poker aesthetic on mobile, requires maintaining two completely different layout systems
- **SVG/Canvas table:** Major rewrite, loses Tailwind styling, overkill for the problem
