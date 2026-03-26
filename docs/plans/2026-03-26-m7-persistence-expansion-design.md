# M7: Persistence & Expansion — Design Document

## Goal

Add local persistence so user progress survives page refreshes, plus a content pack system for expandable drill spots, and a data export/import feature for backup.

## Non-Goals

- No backend or cloud sync (future milestone)
- No advanced attempt pruning/archiving (build when needed)
- No user accounts or auth

---

## 1. Storage Strategy

### Hybrid: localStorage + IndexedDB

| Data | Storage | Mechanism | Rationale |
|------|---------|-----------|-----------|
| `progressStore.conceptMastery` | localStorage | zustand `persist` middleware | Small (~2.5 KB), sync hydration |
| `progressStore.sessions` | localStorage | zustand `persist` middleware | Small (~12 KB at 100 sessions) |
| `progressStore.overallStats` | localStorage | zustand `persist` middleware | Tiny (~80 B) |
| `progressStore.attempts` | IndexedDB | `idb-keyval` (600 B gzipped) | Unbounded growth (~100 B/attempt, ~1 MB at 10K) |
| `gameStore.settings` | localStorage | zustand `persist` middleware | Tiny (~50 B) |
| `gameStore.trainingMode` | localStorage | zustand `persist` middleware | 1 byte |
| `drillStore.lastFilters` (NEW) | localStorage | zustand `persist` middleware | ~100 B, user preference |

### Why Not Full IndexedDB?

- Zustand's `persist` middleware works out of the box with localStorage — zero config, synchronous hydration, automatic serialization.
- Only `attempts[]` needs IndexedDB due to unbounded growth. Everything else fits in <20 KB total.
- `idb-keyval` is a 600-byte wrapper — lighter than any IndexedDB ORM.

### Why Not Full localStorage?

- localStorage has a ~5 MB limit. At 100 bytes/attempt, 50K attempts would exhaust it. IndexedDB has effectively unlimited storage.

---

## 2. Schema Versioning & Migrations

Each persisted store gets a version number embedded in the storage key:

```
localStorage keys:
  ppa-progress-v1   → { conceptMastery, sessions, overallStats }
  ppa-settings-v1   → { settings, trainingMode }
  ppa-drill-v1      → { lastFilters }

IndexedDB:
  database: "ppa"
  store: "attempts-v1"  → AttemptRecord[]
```

**Migration strategy:**

```typescript
interface StorageMigration {
    version: number;
    migrate: (oldState: unknown) => unknown;
}
```

Zustand `persist` middleware supports a `version` field and `migrate` callback. On hydration, if stored version < current version, the migrate function transforms old state to new shape.

For IndexedDB (attempts), we store a version marker alongside the data. On app startup, the hydration function checks the version and runs any needed transforms.

---

## 3. Hydration Architecture

```
App Startup
    │
    ├─ zustand/persist auto-hydrates from localStorage (sync)
    │   ├─ progressStore: conceptMastery, sessions, overallStats
    │   ├─ gameStore: settings, trainingMode
    │   └─ drillStore: lastFilters
    │
    └─ progressStore.hydrate() loads attempts from IndexedDB (async)
        │
        └─ Sets isHydrated = true when complete
```

### Hydration Hook

```typescript
// src/hooks/useHydration.ts
export function useHydration(): boolean {
    return useProgressStore((s) => s.isHydrated);
}
```

Components that need attempts data (data integrity, export) check `isHydrated` before rendering. Most components only need `conceptMastery`/`sessions`/`overallStats`, which are available synchronously.

### New progressStore Fields

```typescript
interface ProgressState {
    // Existing fields (persisted via localStorage)
    conceptMastery: Record<string, ConceptMastery>;
    sessions: SessionSummary[];
    overallStats: OverallStats;

    // Existing field (persisted via IndexedDB)
    attempts: AttemptRecord[];

    // NEW: hydration state
    isHydrated: boolean;

    // NEW: actions
    hydrate: () => Promise<void>;         // load attempts from IndexedDB
    rebuildMastery: () => void;           // replay attempts → reconstruct conceptMastery
    exportData: () => Promise<string>;    // JSON export of all data
    importData: (json: string) => Promise<void>;  // JSON import + rebuild
    clearAllData: () => Promise<void>;    // nuclear reset
}
```

---

## 4. Data Integrity & Rebuild

Since `conceptMastery` is derivable from `attempts`, we have a natural repair path:

```typescript
function rebuildMastery(): void {
    // Reset all conceptMastery to empty
    // Replay every AttemptRecord in chronological order
    // Recompute accuracy, recentAccuracy, streak, level for each concept
    // Update overallStats
}
```

**When to rebuild:**
- On import (always rebuild after importing data)
- On schema migration failure (fallback: rebuild from raw attempts)
- Manual trigger (developer/debug tool)

---

## 5. Export / Import

### Export Format

```json
{
    "version": 1,
    "exportedAt": "2026-03-26T12:00:00Z",
    "app": "ppa",
    "data": {
        "conceptMastery": { ... },
        "sessions": [ ... ],
        "overallStats": { ... },
        "attempts": [ ... ],
        "settings": { ... },
        "trainingMode": true
    }
}
```

### Export Flow

1. User clicks "Export Data" in a Settings/Profile page
2. App gathers all data from stores (including async IndexedDB load)
3. Generates JSON, creates a `Blob`, triggers download as `ppa-backup-YYYY-MM-DD.json`

### Import Flow

1. User selects a `.json` file via file picker
2. App validates the format and version
3. Overwrites all stores with imported data
4. Runs `rebuildMastery()` to ensure consistency
5. Persists all data back to localStorage + IndexedDB

### Clear Data Flow

1. User clicks "Clear All Data" with a confirmation dialog
2. Clears localStorage keys (`ppa-progress-v1`, `ppa-settings-v1`, `ppa-drill-v1`)
3. Clears IndexedDB store (`attempts-v1`)
4. Resets all Zustand stores to initial state

---

## 6. Content Packs

### DrillPack Type

```typescript
interface DrillPack {
    id: string;               // "core" | "multiway" | ...
    name: string;             // "Core Spots"
    description: string;      // "37 essential GTO training spots"
    version: number;          // for future updates
    spots: DrillSpot[];
}
```

### Registry

```typescript
// src/data/drillPacks.ts
import { CORE_PACK } from "./packs/core";

export const DRILL_PACKS: DrillPack[] = [CORE_PACK];

export function getAllSpots(): DrillSpot[] {
    return DRILL_PACKS.flatMap((pack) => pack.spots);
}
```

### Migration of Existing Data

- Current `DRILL_SPOTS` array in `src/data/drillSpots.ts` becomes the "Core" pack
- `drillStore` changes from importing `DRILL_SPOTS` directly to calling `getAllSpots()` from the registry
- All existing spot IDs remain unchanged — no migration needed for progress data

### First Expansion Pack: "Multiway Pots"

10-15 new spots covering 3+ player scenarios:
- 3-bet pots with cold caller
- Squeeze spots with multiple callers
- Multiway flop c-bet decisions
- Multiway check-raise opportunities

Spot IDs prefixed with `multiway_` to avoid collisions.

### UI Changes

- `DrillSetup` shows a pack selector (checkboxes to enable/disable packs)
- Pack selection stored in `lastFilters` (persisted)
- Concept filtering works across all enabled packs

---

## 7. Settings / Profile Page

New route: `/settings`

Sections:
- **Game Settings**: Player count, blinds, starting stack (currently in gameStore)
- **Data Management**: Export, Import, Clear All Data
- **About**: Version, link to repo

Navigation: Add "Settings" icon to the bottom nav / sidebar.

---

## 8. Route-Level Lazy Loading (Bonus)

Address deferred issue M6-3 (770 KB bundle). Convert page imports to lazy:

```typescript
const PracticePage = lazy(() => import("./pages/PracticePage"));
const LearnPage = lazy(() => import("./pages/LearnPage"));
const DrillPage = lazy(() => import("./pages/DrillPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
```

Wrap routes in `<Suspense>` with a minimal loading spinner. This splits the bundle so initial load only includes the landing route.

---

## 9. Dependency Additions

| Package | Size (gzipped) | Purpose |
|---------|----------------|---------|
| `idb-keyval` | ~600 B | IndexedDB key-value wrapper for attempts |

No other dependencies. Zustand `persist` middleware is built-in.

---

## 10. File Impact Summary

### New Files
- `src/lib/persistence.ts` — IndexedDB helpers, export/import, rebuild
- `src/data/drillPacks.ts` — Pack registry
- `src/data/packs/core.ts` — Core pack (wraps existing DRILL_SPOTS)
- `src/data/packs/multiway.ts` — Multiway expansion pack
- `src/pages/SettingsPage.tsx` — Settings/data management page
- `src/hooks/useHydration.ts` — Hydration state hook
- `src/components/settings/DataManagement.tsx` — Export/import/clear UI
- `src/components/settings/PackSelector.tsx` — Drill pack toggle UI

### Modified Files
- `src/store/progressStore.ts` — Add persist middleware, hydrate action, isHydrated, export/import/clear/rebuild actions
- `src/store/gameStore.ts` — Add persist middleware (partialize to settings + trainingMode only)
- `src/store/drillStore.ts` — Add lastFilters field with persist, use getAllSpots() instead of DRILL_SPOTS
- `src/data/drillSpots.ts` — Minimal change: re-export from core pack for backward compat
- `src/App.tsx` — Add settings route, lazy loading, hydration trigger
- `src/components/layout/*.tsx` — Add Settings nav link

---

## 11. Acceptance Criteria

- [ ] Progress data (conceptMastery, sessions, overallStats) persists across page refresh
- [ ] Attempt log persists in IndexedDB across page refresh
- [ ] Game settings and training mode persist across page refresh
- [ ] Last-used drill filters persist across page refresh
- [ ] User can export all data as a JSON file
- [ ] User can import data from a JSON backup file
- [ ] User can clear all data with confirmation
- [ ] rebuildMastery correctly reconstructs conceptMastery from raw attempts
- [ ] Schema version is stored; migration framework exists for future changes
- [ ] Core drill pack wraps existing 37 spots with no ID changes
- [ ] Multiway expansion pack adds 10-15 new spots
- [ ] DrillSetup shows pack selector
- [ ] Settings page exists at /settings with data management controls
- [ ] Route-level lazy loading reduces initial bundle size
- [ ] All existing 277 tests still pass
- [ ] New tests cover persistence, export/import, rebuild, pack registration
