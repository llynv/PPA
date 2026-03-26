# M7: Persistence & Expansion — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add local persistence so user progress survives page refreshes, plus a content pack system for expandable drill spots, a data export/import feature, a Settings page, and route-level lazy loading.

**Architecture:** Hybrid storage: Zustand `persist` middleware with `localStorage` for small stores + `idb-keyval` for `attempts[]` in IndexedDB. Content packs wrap existing drill spots and add a multiway expansion. Route-level lazy loading via `React.lazy` + `Suspense`.

**Tech Stack:** Zustand persist, idb-keyval, React.lazy, React Suspense, TypeScript, Vitest

---

## Task 1: Install `idb-keyval` Dependency

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run: `npm install idb-keyval`

**Step 2: Verify installation**

Run: `npm ls idb-keyval`
Expected: `idb-keyval@x.x.x` listed

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add idb-keyval for IndexedDB persistence"
```

---

## Task 2: Create Persistence Helpers (`src/lib/persistence.ts`)

**Files:**
- Create: `src/lib/persistence.ts`
- Create: `src/lib/__tests__/persistence.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/lib/__tests__/persistence.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

// We mock idb-keyval since jsdom doesn't have IndexedDB
vi.mock("idb-keyval", () => {
    let store: Record<string, unknown> = {};
    return {
        get: vi.fn((key: string) => Promise.resolve(store[key])),
        set: vi.fn((key: string, val: unknown) => {
            store[key] = val;
            return Promise.resolve();
        }),
        del: vi.fn((key: string) => {
            delete store[key];
            return Promise.resolve();
        }),
        clear: vi.fn(() => {
            store = {};
            return Promise.resolve();
        }),
        __resetStore: () => { store = {}; },
    };
});

import {
    loadAttempts,
    saveAttempts,
    clearAttempts,
    ATTEMPTS_KEY,
} from "../persistence";

// Access the mock's internal reset
const idbKeyval = await import("idb-keyval");

describe("persistence helpers", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (idbKeyval as unknown as { __resetStore: () => void }).__resetStore();
    });

    describe("loadAttempts", () => {
        it("returns empty array when nothing stored", async () => {
            const result = await loadAttempts();
            expect(result).toEqual([]);
        });

        it("returns stored attempts", async () => {
            const attempts = [
                { id: "1", source: "drill", concept: "cbet_value", isCorrect: true, evDelta: 0, timestamp: 1000 },
            ];
            await idbKeyval.set(ATTEMPTS_KEY, attempts);
            const result = await loadAttempts();
            expect(result).toEqual(attempts);
        });
    });

    describe("saveAttempts", () => {
        it("saves attempts to IndexedDB", async () => {
            const attempts = [
                { id: "1", source: "drill" as const, concept: "cbet_value", isCorrect: true, evDelta: 0, timestamp: 1000 },
            ];
            await saveAttempts(attempts as any);
            expect(idbKeyval.set).toHaveBeenCalledWith(ATTEMPTS_KEY, attempts);
        });
    });

    describe("clearAttempts", () => {
        it("deletes the attempts key from IndexedDB", async () => {
            await clearAttempts();
            expect(idbKeyval.del).toHaveBeenCalledWith(ATTEMPTS_KEY);
        });
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/persistence.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// src/lib/persistence.ts
import { get, set, del } from "idb-keyval";
import type { AttemptRecord } from "../types/progress";

export const ATTEMPTS_KEY = "ppa-attempts-v1";

export async function loadAttempts(): Promise<AttemptRecord[]> {
    try {
        const data = await get<AttemptRecord[]>(ATTEMPTS_KEY);
        return data ?? [];
    } catch {
        console.warn("[PPA] Failed to load attempts from IndexedDB");
        return [];
    }
}

export async function saveAttempts(attempts: AttemptRecord[]): Promise<void> {
    try {
        await set(ATTEMPTS_KEY, attempts);
    } catch {
        console.warn("[PPA] Failed to save attempts to IndexedDB");
    }
}

export async function clearAttempts(): Promise<void> {
    try {
        await del(ATTEMPTS_KEY);
    } catch {
        console.warn("[PPA] Failed to clear attempts from IndexedDB");
    }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/persistence.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/lib/persistence.ts src/lib/__tests__/persistence.test.ts
git commit -m "feat(m7): add IndexedDB persistence helpers via idb-keyval"
```

---

## Task 3: Add `persist` Middleware to `progressStore`

This is the core persistence task. We add zustand `persist` for localStorage fields, async hydration of attempts from IndexedDB, `rebuildMastery`, `exportData`, `importData`, and `clearAllData`.

**Files:**
- Modify: `src/store/progressStore.ts`
- Modify: `src/store/__tests__/progressStore.test.ts`

**Step 1: Write failing tests for new actions**

Add the following to the END of `src/store/__tests__/progressStore.test.ts`:

```typescript
import { loadAttempts, saveAttempts, clearAttempts } from "../../lib/persistence";

// Mock persistence module
vi.mock("../../lib/persistence", () => ({
    loadAttempts: vi.fn(() => Promise.resolve([])),
    saveAttempts: vi.fn(() => Promise.resolve()),
    clearAttempts: vi.fn(() => Promise.resolve()),
    ATTEMPTS_KEY: "ppa-attempts-v1",
}));

describe("hydration", () => {
    it("starts with isHydrated = false", () => {
        expect(useProgressStore.getState().isHydrated).toBe(false);
    });

    it("hydrate loads attempts from IndexedDB and sets isHydrated", async () => {
        const storedAttempts = [
            { id: "stored-1", source: "drill" as const, concept: "cbet_value", isCorrect: true, evDelta: 0, timestamp: 1000 },
        ];
        vi.mocked(loadAttempts).mockResolvedValueOnce(storedAttempts);

        await useProgressStore.getState().hydrate();

        const state = useProgressStore.getState();
        expect(state.isHydrated).toBe(true);
        expect(state.attempts).toEqual(storedAttempts);
    });
});

describe("rebuildMastery", () => {
    it("reconstructs conceptMastery from raw attempts", () => {
        const { recordDrillAttempt } = useProgressStore.getState();
        const spot = mockDrillSpot({ concept: "cbet_value" });

        // Record 3 correct, 1 incorrect
        recordDrillAttempt(mockDrillResult(true), spot);
        recordDrillAttempt(mockDrillResult(true), spot);
        recordDrillAttempt(mockDrillResult(true), spot);
        recordDrillAttempt(mockDrillResult(false), spot);

        // Manually corrupt mastery
        useProgressStore.setState({
            conceptMastery: { cbet_value: { ...createEmptyMastery("cbet_value"), totalAttempts: 999 } },
        });

        useProgressStore.getState().rebuildMastery();

        const mastery = useProgressStore.getState().conceptMastery["cbet_value"];
        expect(mastery).toBeDefined();
        expect(mastery!.totalAttempts).toBe(4);
        expect(mastery!.correctAttempts).toBe(3);
        expect(mastery!.accuracy).toBeCloseTo(0.75);
    });
});

describe("exportData / importData", () => {
    it("exports all data as JSON string", async () => {
        const { recordDrillAttempt } = useProgressStore.getState();
        recordDrillAttempt(mockDrillResult(true), mockDrillSpot());

        const json = await useProgressStore.getState().exportData();
        const parsed = JSON.parse(json);

        expect(parsed.version).toBe(1);
        expect(parsed.app).toBe("ppa");
        expect(parsed.data.attempts.length).toBe(1);
        expect(parsed.data.conceptMastery).toBeDefined();
        expect(parsed.data.overallStats).toBeDefined();
        expect(parsed.data.sessions).toBeDefined();
    });

    it("importData restores state and rebuilds mastery", async () => {
        const exportJson = JSON.stringify({
            version: 1,
            app: "ppa",
            exportedAt: new Date().toISOString(),
            data: {
                attempts: [
                    { id: "imp-1", source: "drill", concept: "open_raise", isCorrect: true, evDelta: 0, timestamp: 500 },
                    { id: "imp-2", source: "drill", concept: "open_raise", isCorrect: false, evDelta: -1, timestamp: 600 },
                ],
                conceptMastery: {},
                sessions: [],
                overallStats: {
                    totalHands: 0,
                    totalDrills: 2,
                    overallAccuracy: 0.5,
                    currentStreak: 0,
                    bestStreak: 1,
                    averageGrade: "C",
                },
            },
        });

        await useProgressStore.getState().importData(exportJson);

        const state = useProgressStore.getState();
        expect(state.attempts.length).toBe(2);
        // Mastery was rebuilt from attempts
        expect(state.conceptMastery["open_raise"]).toBeDefined();
        expect(state.conceptMastery["open_raise"]!.totalAttempts).toBe(2);
    });

    it("importData rejects invalid JSON", async () => {
        await expect(
            useProgressStore.getState().importData("not json")
        ).rejects.toThrow();
    });

    it("importData rejects wrong app field", async () => {
        const bad = JSON.stringify({ version: 1, app: "wrong", data: {} });
        await expect(
            useProgressStore.getState().importData(bad)
        ).rejects.toThrow("Invalid backup file");
    });
});

describe("clearAllData", () => {
    it("resets all state and clears IndexedDB", async () => {
        const { recordDrillAttempt } = useProgressStore.getState();
        recordDrillAttempt(mockDrillResult(true), mockDrillSpot());

        await useProgressStore.getState().clearAllData();

        const state = useProgressStore.getState();
        expect(state.attempts).toEqual([]);
        expect(state.conceptMastery).toEqual({});
        expect(state.sessions).toEqual([]);
        expect(state.overallStats.totalDrills).toBe(0);
        expect(clearAttempts).toHaveBeenCalled();
    });
});
```

Note: `mockDrillResult` helper needs to be added if not present. Add near top with other helpers:

```typescript
function mockDrillResult(isCorrect: boolean, evDelta = 0): DrillResult {
    return {
        spotId: "spot-1",
        heroAction: isCorrect ? "raise" : "fold",
        isCorrect,
        evDelta,
        optimalResult: {
            optimalAction: "raise",
            frequencies: { fold: 0, call: 0.3, raise: 0.7 },
            evByAction: { fold: -5, call: 2, raise: 5 },
        },
        timestamp: Date.now(),
    };
}
```

Also add at top of file: `import { createEmptyMastery } from "../../lib/progress";`

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/__tests__/progressStore.test.ts`
Expected: FAIL — `isHydrated`, `hydrate`, `rebuildMastery`, `exportData`, `importData`, `clearAllData` not found on store

**Step 3: Modify `progressStore.ts`**

Changes to `src/store/progressStore.ts`:

1. Add imports at top:
```typescript
import { persist } from "zustand/middleware";
import { loadAttempts, saveAttempts, clearAttempts } from "../lib/persistence";
import { computeMasteryLevel, computeRecentAccuracy, createEmptyMastery } from "../lib/progress";
```

2. Extend the `ProgressStore` interface with new fields and actions:
```typescript
interface ProgressStore {
    // State
    conceptMastery: Record<string, ConceptMastery>;
    sessions: SessionSummary[];
    attempts: AttemptRecord[];
    overallStats: OverallStats;

    // Hydration state
    isHydrated: boolean;

    // Record actions (existing)
    recordLiveHand: (analysis: AnalysisData) => void;
    recordDrillAttempt: (result: DrillResult, spot: DrillSpot) => void;
    recordDrillSession: (session: DrillSession) => void;

    // Query methods (existing)
    getWeakestConcepts: (n: number) => ConceptMastery[];
    getStrongestConcepts: (n: number) => ConceptMastery[];
    getRecentSessions: (n: number) => SessionSummary[];
    getMasteryDistribution: () => Record<MasteryLevel, number>;

    // NEW: persistence actions
    hydrate: () => Promise<void>;
    rebuildMastery: () => void;
    exportData: () => Promise<string>;
    importData: (json: string) => Promise<void>;
    clearAllData: () => Promise<void>;
}
```

3. Wrap the `create` call with `persist` middleware:
```typescript
export const useProgressStore = create<ProgressStore>()(
    persist(
        (set, get) => ({
            // ... all existing state and actions unchanged ...

            // NEW initial field
            isHydrated: false,

            // NEW: hydrate — loads attempts from IndexedDB
            hydrate: async () => {
                const attempts = await loadAttempts();
                set({ attempts, isHydrated: true });
            },

            // NEW: rebuildMastery — replay all attempts to reconstruct conceptMastery
            rebuildMastery: () => {
                const { attempts } = get();
                const rebuilt: Record<string, ConceptMastery> = {};
                let totalHands = 0;
                let totalDrills = 0;
                let correctDrills = 0;
                let currentStreak = 0;
                let bestStreak = 0;
                let gradeSum = 0;
                let gradeCount = 0;

                // Sort by timestamp to replay in order
                const sorted = [...attempts].sort((a, b) => a.timestamp - b.timestamp);

                for (const attempt of sorted) {
                    const concept = attempt.concept;
                    if (!rebuilt[concept]) {
                        rebuilt[concept] = createEmptyMastery(concept);
                    }
                    const mastery = rebuilt[concept];

                    mastery.totalAttempts++;
                    if (attempt.isCorrect) {
                        mastery.correctAttempts++;
                        mastery.streak++;
                        currentStreak++;
                    } else {
                        mastery.streak = 0;
                        currentStreak = 0;
                    }
                    mastery.bestStreak = Math.max(mastery.bestStreak, mastery.streak);
                    bestStreak = Math.max(bestStreak, currentStreak);

                    mastery.accuracy = mastery.correctAttempts / mastery.totalAttempts;
                    mastery.totalEvDelta += attempt.evDelta;
                    mastery.lastAttemptAt = attempt.timestamp;

                    if (attempt.source === "drill") {
                        totalDrills++;
                        if (attempt.isCorrect) correctDrills++;
                    } else {
                        totalHands++;
                        if (attempt.grade) {
                            gradeSum += GRADE_VALUES[attempt.grade] ?? 0;
                            gradeCount++;
                        }
                    }
                }

                // Compute recentAccuracy and level for each concept
                for (const concept of Object.keys(rebuilt)) {
                    rebuilt[concept].recentAccuracy = computeRecentAccuracy(sorted, concept);
                    rebuilt[concept].level = computeMasteryLevel(rebuilt[concept]);
                }

                const overallAccuracy = totalDrills > 0 ? correctDrills / totalDrills : 0;
                const averageGrade = gradeCount > 0 ? numericToGrade(gradeSum / gradeCount) : "C";

                set({
                    conceptMastery: rebuilt,
                    overallStats: {
                        totalHands,
                        totalDrills,
                        overallAccuracy,
                        currentStreak,
                        bestStreak,
                        averageGrade,
                    },
                });
            },

            // NEW: exportData
            exportData: async () => {
                const state = get();
                const exportObj = {
                    version: 1,
                    exportedAt: new Date().toISOString(),
                    app: "ppa",
                    data: {
                        conceptMastery: state.conceptMastery,
                        sessions: state.sessions,
                        overallStats: state.overallStats,
                        attempts: state.attempts,
                    },
                };
                return JSON.stringify(exportObj, null, 2);
            },

            // NEW: importData
            importData: async (json: string) => {
                let parsed: unknown;
                try {
                    parsed = JSON.parse(json);
                } catch {
                    throw new Error("Invalid JSON format");
                }

                const obj = parsed as Record<string, unknown>;
                if (obj.app !== "ppa") {
                    throw new Error("Invalid backup file");
                }

                const data = obj.data as Record<string, unknown>;
                if (!data || !Array.isArray(data.attempts)) {
                    throw new Error("Invalid backup file: missing attempts");
                }

                const attempts = data.attempts as AttemptRecord[];
                const sessions = (data.sessions ?? []) as SessionSummary[];
                const overallStats = (data.overallStats ?? get().overallStats) as OverallStats;

                // Save attempts to IndexedDB
                await saveAttempts(attempts);

                // Set state, then rebuild mastery from attempts
                set({
                    attempts,
                    sessions,
                    overallStats,
                    conceptMastery: {},
                });
                get().rebuildMastery();
            },

            // NEW: clearAllData
            clearAllData: async () => {
                await clearAttempts();
                set({
                    conceptMastery: {},
                    sessions: [],
                    attempts: [],
                    overallStats: {
                        totalHands: 0,
                        totalDrills: 0,
                        overallAccuracy: 0,
                        currentStreak: 0,
                        bestStreak: 0,
                        averageGrade: "C",
                    },
                    isHydrated: false,
                });
            },
        }),
        {
            name: "ppa-progress-v1",
            version: 1,
            partialize: (state) => ({
                conceptMastery: state.conceptMastery,
                sessions: state.sessions,
                overallStats: state.overallStats,
                // NOTE: attempts are NOT persisted here — they go to IndexedDB
            }),
        }
    )
);
```

**IMPORTANT**: In `recordLiveHand` and `recordDrillAttempt`, after each `set()` call, add a fire-and-forget save to IndexedDB:

```typescript
// At the end of recordLiveHand, after the set() call:
saveAttempts(get().attempts).catch(() => {});

// At the end of recordDrillAttempt, after the set() call:
saveAttempts(get().attempts).catch(() => {});
```

**Step 4: Run tests**

Run: `npx vitest run src/store/__tests__/progressStore.test.ts`
Expected: ALL PASS

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: ALL 277+ tests pass

**Step 6: Commit**

```bash
git add src/store/progressStore.ts src/store/__tests__/progressStore.test.ts
git commit -m "feat(m7): add persistence to progressStore with hydration, rebuild, export/import, clear"
```

---

## Task 4: Add `persist` Middleware to `gameStore`

**Files:**
- Modify: `src/store/gameStore.ts`

**Step 1: Add persist middleware**

Wrap the `create` call with `persist`, partializing to only `settings` and `trainingMode`:

```typescript
import { persist } from "zustand/middleware";

export const useGameStore = create<StoreState>()(
    persist(
        (set, get) => ({
            // ... all existing code unchanged ...
        }),
        {
            name: "ppa-settings-v1",
            version: 1,
            partialize: (state) => ({
                settings: state.settings,
                trainingMode: state.trainingMode,
            }),
        }
    )
);
```

**Step 2: Verify existing tests still pass**

Run: `npx vitest run src/store/__tests__/gameStore.review.test.ts`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat(m7): persist game settings and training mode via localStorage"
```

---

## Task 5: Content Pack System — Types, Registry, Core Pack

**Files:**
- Create: `src/types/drillPack.ts`
- Create: `src/data/drillPacks.ts`
- Create: `src/data/packs/core.ts`
- Modify: `src/data/drillSpots.ts` (minimal — keep DRILL_SPOTS export for backward compat)
- Create: `src/data/__tests__/drillPacks.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/data/__tests__/drillPacks.test.ts
import { describe, it, expect } from "vitest";
import { DRILL_PACKS, getAllSpots, getPackById } from "../drillPacks";
import { DRILL_SPOTS } from "../drillSpots";

describe("drillPacks registry", () => {
    it("has at least the core pack", () => {
        expect(DRILL_PACKS.length).toBeGreaterThanOrEqual(1);
        const core = DRILL_PACKS.find((p) => p.id === "core");
        expect(core).toBeDefined();
        expect(core!.name).toBe("Core Spots");
    });

    it("core pack contains all 37 original spots", () => {
        const core = DRILL_PACKS.find((p) => p.id === "core")!;
        expect(core.spots.length).toBe(37);
    });

    it("getAllSpots returns all spots from all packs", () => {
        const all = getAllSpots();
        expect(all.length).toBeGreaterThanOrEqual(37);
    });

    it("getAllSpots includes core spots with unchanged IDs", () => {
        const all = getAllSpots();
        const coreIds = DRILL_SPOTS.map((s) => s.id);
        for (const id of coreIds) {
            expect(all.some((s) => s.id === id)).toBe(true);
        }
    });

    it("getPackById returns correct pack", () => {
        const core = getPackById("core");
        expect(core).toBeDefined();
        expect(core!.id).toBe("core");
    });

    it("getPackById returns undefined for unknown id", () => {
        expect(getPackById("nonexistent")).toBeUndefined();
    });

    it("all spot IDs are unique across packs", () => {
        const all = getAllSpots();
        const ids = all.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/data/__tests__/drillPacks.test.ts`
Expected: FAIL — modules not found

**Step 3: Create DrillPack type**

```typescript
// src/types/drillPack.ts
import type { DrillSpot } from "./drill";

export interface DrillPack {
    id: string;
    name: string;
    description: string;
    version: number;
    spots: DrillSpot[];
}
```

**Step 4: Create core pack wrapper**

```typescript
// src/data/packs/core.ts
import type { DrillPack } from "../../types/drillPack";
import { DRILL_SPOTS } from "../drillSpots";

export const CORE_PACK: DrillPack = {
    id: "core",
    name: "Core Spots",
    description: "37 essential GTO training spots covering preflop through river",
    version: 1,
    spots: DRILL_SPOTS,
};
```

**Step 5: Create registry**

```typescript
// src/data/drillPacks.ts
import type { DrillPack } from "../types/drillPack";
import type { DrillSpot } from "../types/drill";
import { CORE_PACK } from "./packs/core";

export const DRILL_PACKS: DrillPack[] = [CORE_PACK];

export function getAllSpots(): DrillSpot[] {
    return DRILL_PACKS.flatMap((pack) => pack.spots);
}

export function getPackById(id: string): DrillPack | undefined {
    return DRILL_PACKS.find((pack) => pack.id === id);
}
```

**Step 6: Run tests**

Run: `npx vitest run src/data/__tests__/drillPacks.test.ts`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add src/types/drillPack.ts src/data/drillPacks.ts src/data/packs/core.ts src/data/__tests__/drillPacks.test.ts
git commit -m "feat(m7): add content pack system with core pack wrapping existing 37 spots"
```

---

## Task 6: Multiway Expansion Pack

**Files:**
- Create: `src/data/packs/multiway.ts`
- Modify: `src/data/drillPacks.ts` — register the new pack
- Modify: `src/data/__tests__/drillPacks.test.ts` — add multiway tests

**Step 1: Add failing tests**

Add to `src/data/__tests__/drillPacks.test.ts`:

```typescript
describe("multiway pack", () => {
    it("exists in the registry", () => {
        const multiway = DRILL_PACKS.find((p) => p.id === "multiway");
        expect(multiway).toBeDefined();
    });

    it("has 10-15 spots", () => {
        const multiway = DRILL_PACKS.find((p) => p.id === "multiway")!;
        expect(multiway.spots.length).toBeGreaterThanOrEqual(10);
        expect(multiway.spots.length).toBeLessThanOrEqual(15);
    });

    it("all spot IDs are prefixed with multiway_", () => {
        const multiway = DRILL_PACKS.find((p) => p.id === "multiway")!;
        for (const spot of multiway.spots) {
            expect(spot.id).toMatch(/^multiway_/);
        }
    });

    it("no ID collisions with core spots", () => {
        const core = DRILL_PACKS.find((p) => p.id === "core")!;
        const multiway = DRILL_PACKS.find((p) => p.id === "multiway")!;
        const coreIds = new Set(core.spots.map((s) => s.id));
        for (const spot of multiway.spots) {
            expect(coreIds.has(spot.id)).toBe(false);
        }
    });

    it("each spot has valid decisionContext", () => {
        const multiway = DRILL_PACKS.find((p) => p.id === "multiway")!;
        for (const spot of multiway.spots) {
            expect(spot.decisionContext).toBeDefined();
            expect(spot.decisionContext.holeCards.length).toBe(2);
            expect(spot.decisionContext.pot).toBeGreaterThan(0);
        }
    });
});
```

**Step 2: Run to verify failure**

Run: `npx vitest run src/data/__tests__/drillPacks.test.ts`
Expected: FAIL — multiway pack not found

**Step 3: Create multiway pack**

Create `src/data/packs/multiway.ts` with 12 multiway spots. Each spot follows the same `DrillSpot` structure as the core spots in `src/data/drillSpots.ts`. Use the same `c()` helper pattern for card construction.

The spots should cover:
- 3-bet pot with cold caller (preflop, concepts: three_bet, cold_call, squeeze)
- Multiway flop c-bet (flop, concepts: cbet_value, cbet_bluff)
- Multiway check-raise (flop/turn, concepts: check_raise)
- Multiway pot control and bluff catch scenarios (turn/river, concepts: pot_control, bluff_catch, barrel)

All spot IDs must be prefixed with `multiway_`. Use realistic poker scenarios with proper `decisionContext` fields — correct `pot`, `toCall`, `stack`, `communityCards`, `round`, `position`, `numPlayers` (3+), and `previousActions` arrays.

**Step 4: Register in `drillPacks.ts`**

```typescript
// Add to src/data/drillPacks.ts
import { MULTIWAY_PACK } from "./packs/multiway";

export const DRILL_PACKS: DrillPack[] = [CORE_PACK, MULTIWAY_PACK];
```

**Step 5: Run tests**

Run: `npx vitest run src/data/__tests__/drillPacks.test.ts`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/data/packs/multiway.ts src/data/drillPacks.ts src/data/__tests__/drillPacks.test.ts
git commit -m "feat(m7): add multiway expansion pack with 12 new GTO training spots"
```

---

## Task 7: Update `drillStore` — `lastFilters`, `persist`, Pack-Aware Spots

**Files:**
- Modify: `src/store/drillStore.ts`
- Modify: `src/store/__tests__/drillStore.test.ts`

**Step 1: Add failing tests for lastFilters**

Add to `src/store/__tests__/drillStore.test.ts`:

```typescript
describe("lastFilters", () => {
    it("starts with null lastFilters", () => {
        expect(useDrillStore.getState().lastFilters).toBeNull();
    });

    it("saves filters when a session starts", () => {
        useDrillStore.getState().startSession({
            categories: ["preflop"],
            difficulties: [1],
            concepts: [],
        });
        const lastFilters = useDrillStore.getState().lastFilters;
        expect(lastFilters).toEqual({
            categories: ["preflop"],
            difficulties: [1],
            concepts: [],
        });
    });
});
```

**Step 2: Run to verify failure**

Run: `npx vitest run src/store/__tests__/drillStore.test.ts`
Expected: FAIL — `lastFilters` not found

**Step 3: Modify drillStore**

Changes to `src/store/drillStore.ts`:

1. Add imports:
```typescript
import { persist } from "zustand/middleware";
import { getAllSpots } from "../data/drillPacks";
```

2. Replace `DRILL_SPOTS` usage with `getAllSpots()`:
- In `startSession`: `const filtered = filterSpots(getAllSpots(), filters);` and `allSpots: getAllSpots()`
- Remove the `import { DRILL_SPOTS } from "../data/drillSpots";` line

3. Add `lastFilters` to interface and state:
```typescript
interface DrillStore {
    phase: DrillPhase;
    session: DrillSession | null;
    currentResult: DrillResult | null;
    lastFilters: DrillFilters | null;
    // ... actions ...
}
```

4. In `startSession`, save filters:
```typescript
startSession: (filters) => {
    const allSpots = getAllSpots();
    const filtered = filterSpots(allSpots, filters);
    if (filtered.length === 0) return;
    const queue = shuffleArray(filtered);

    set({
        phase: 'drilling',
        session: { allSpots, queue, currentIndex: 0, results: [], filters, streak: 0, bestStreak: 0 },
        currentResult: null,
        lastFilters: filters,
    });
},
```

5. Wrap with persist:
```typescript
export const useDrillStore = create<DrillStore>()(
    persist(
        (set, get) => ({
            // ... all state and actions ...
            lastFilters: null,
        }),
        {
            name: "ppa-drill-v1",
            version: 1,
            partialize: (state) => ({
                lastFilters: state.lastFilters,
            }),
        }
    )
);
```

**Step 4: Run tests**

Run: `npx vitest run src/store/__tests__/drillStore.test.ts`
Expected: ALL PASS

**Step 5: Run full suite**

Run: `npx vitest run`
Expected: ALL tests pass

**Step 6: Commit**

```bash
git add src/store/drillStore.ts src/store/__tests__/drillStore.test.ts
git commit -m "feat(m7): persist drill filters, switch to pack-aware getAllSpots()"
```

---

## Task 8: Update `DrillSetup` to Use Packs and `lastFilters`

**Files:**
- Modify: `src/components/drill/DrillSetup.tsx`

**Step 1: Update DrillSetup**

Changes:
1. Replace `import { DRILL_SPOTS } from "../../data/drillSpots"` with `import { getAllSpots, DRILL_PACKS } from "../../data/drillPacks"`.
2. Use `getAllSpots()` instead of `DRILL_SPOTS` in the matching count calculation.
3. Read `lastFilters` from `useDrillStore` and use it as initial state for filters (if no `conceptParam`):

```typescript
const lastFilters = useDrillStore((s) => s.lastFilters);

const [selectedCategories, setSelectedCategories] = useState<SpotCategory[]>(
    lastFilters?.categories ?? []
);
const [selectedDifficulties, setSelectedDifficulties] = useState<(1 | 2 | 3)[]>(
    lastFilters?.difficulties ?? []
);
const [selectedConcepts, setSelectedConcepts] = useState<DrillConcept[]>(
    lastFilters?.concepts ?? []
);
```

The `useEffect` for `conceptParam` overrides if present — keep that logic.

4. Update matching count to use `getAllSpots()`:
```typescript
const allSpots = useMemo(() => getAllSpots(), []);
const matchingCount = useMemo(() => {
    return allSpots.filter((s) => {
        if (selectedCategories.length > 0 && !selectedCategories.includes(s.category)) return false;
        if (selectedDifficulties.length > 0 && !selectedDifficulties.includes(s.difficulty)) return false;
        if (selectedConcepts.length > 0 && !selectedConcepts.includes(s.concept)) return false;
        return true;
    }).length;
}, [allSpots, selectedCategories, selectedDifficulties, selectedConcepts]);
```

**Step 2: Verify build**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean types, all tests pass

**Step 3: Commit**

```bash
git add src/components/drill/DrillSetup.tsx
git commit -m "feat(m7): DrillSetup uses pack-aware spots and restores last filters"
```

---

## Task 9: Hydration Hook and App Integration

**Files:**
- Create: `src/hooks/useHydration.ts`
- Modify: `src/App.tsx`

**Step 1: Create hydration hook**

```typescript
// src/hooks/useHydration.ts
import { useEffect } from "react";
import { useProgressStore } from "../store/progressStore";

export function useHydration(): boolean {
    const isHydrated = useProgressStore((s) => s.isHydrated);
    const hydrate = useProgressStore((s) => s.hydrate);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    return isHydrated;
}
```

**Step 2: Integrate in App.tsx**

At the top of the `App` function, trigger hydration. We don't need to block rendering since localStorage data hydrates synchronously — IndexedDB hydration is only needed for full data export or rebuild scenarios.

```typescript
import { useHydration } from "./hooks/useHydration";

function App() {
    useHydration();

    return (
        <Routes>
            {/* ... unchanged routes ... */}
        </Routes>
    );
}
```

**Step 3: Verify build**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean, all pass

**Step 4: Commit**

```bash
git add src/hooks/useHydration.ts src/App.tsx
git commit -m "feat(m7): add hydration hook for IndexedDB attempt loading on app start"
```

---

## Task 10: Settings Page with Data Management

**Files:**
- Create: `src/pages/SettingsPage.tsx`
- Create: `src/components/settings/DataManagement.tsx`
- Modify: `src/App.tsx` — add `/settings` route
- Modify: `src/components/layout/productNav.ts` — add Settings nav item

**Step 1: Create DataManagement component**

```typescript
// src/components/settings/DataManagement.tsx
import { useState } from "react";
import { useProgressStore } from "../../store/progressStore";

export function DataManagement() {
    const exportData = useProgressStore((s) => s.exportData);
    const importData = useProgressStore((s) => s.importData);
    const clearAllData = useProgressStore((s) => s.clearAllData);
    const isHydrated = useProgressStore((s) => s.isHydrated);

    const [status, setStatus] = useState<string | null>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const handleExport = async () => {
        try {
            const json = await exportData();
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            const date = new Date().toISOString().split("T")[0];
            a.href = url;
            a.download = `ppa-backup-${date}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setStatus("Data exported successfully");
        } catch {
            setStatus("Export failed");
        }
    };

    const handleImport = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                await importData(text);
                setStatus("Data imported successfully");
            } catch (err) {
                setStatus(`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
        };
        input.click();
    };

    const handleClear = async () => {
        await clearAllData();
        setShowClearConfirm(false);
        setStatus("All data cleared");
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-neutral-100 mb-1">Data Management</h2>
            <p className="text-neutral-400 text-sm mb-4">
                Export, import, or clear your training data.
            </p>

            {!isHydrated && (
                <p className="text-amber-400 text-sm mb-4">Loading data from storage...</p>
            )}

            <div className="flex flex-wrap gap-3 mb-4">
                <button
                    onClick={handleExport}
                    disabled={!isHydrated}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    Export Backup
                </button>

                <button
                    onClick={handleImport}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    Import Backup
                </button>

                {!showClearConfirm ? (
                    <button
                        onClick={() => setShowClearConfirm(true)}
                        className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        Clear All Data
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <span className="text-red-400 text-sm">Are you sure?</span>
                        <button
                            onClick={handleClear}
                            className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                            Yes, delete everything
                        </button>
                        <button
                            onClick={() => setShowClearConfirm(false)}
                            className="bg-neutral-700 hover:bg-neutral-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {status && (
                <p className="text-sm text-neutral-300">{status}</p>
            )}
        </div>
    );
}
```

**Step 2: Create SettingsPage**

```typescript
// src/pages/SettingsPage.tsx
import { DataManagement } from "../components/settings/DataManagement";

export function SettingsPage() {
    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-neutral-100 mb-1">Settings</h1>
                <p className="text-neutral-400 text-sm">
                    Manage your data and preferences.
                </p>
            </div>

            <DataManagement />

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
                <h2 className="text-lg font-bold text-neutral-100 mb-1">About</h2>
                <p className="text-neutral-400 text-sm">
                    PPA — Poker Practice App v0.1.0
                </p>
                <p className="text-neutral-500 text-xs mt-2">
                    Learning-first GTO coach. Built with React, TypeScript, and Zustand.
                </p>
            </div>
        </div>
    );
}
```

**Step 3: Add Settings route to App.tsx**

Add to imports: `import { SettingsPage } from "./pages/SettingsPage";`

Add route inside the `<Route element={<AppShell />}>` block, before the wildcard:
```tsx
<Route path="settings" element={<SettingsPage />} />
```

**Step 4: Add Settings nav item**

In `src/components/layout/productNav.ts`, add to the `PRODUCT_NAV_ITEMS` array:
```typescript
{ to: "/settings", label: "Settings" },
```

**Step 5: Verify build**

Run: `npx tsc --noEmit && npx vitest run`
Expected: clean, all pass

**Step 6: Commit**

```bash
git add src/pages/SettingsPage.tsx src/components/settings/DataManagement.tsx src/App.tsx src/components/layout/productNav.ts
git commit -m "feat(m7): add Settings page with data export/import/clear controls"
```

---

## Task 11: Route-Level Lazy Loading

**Files:**
- Modify: `src/App.tsx`

**Step 1: Convert page imports to lazy**

Replace all direct page imports with `React.lazy`:

```typescript
import { Suspense, lazy } from "react";
import { AppShell } from "./components/layout/AppShell";
import { Navigate, Route, Routes } from "react-router-dom";
import { useHydration } from "./hooks/useHydration";

const HomePage = lazy(() => import("./pages/HomePage"));
const PracticePage = lazy(() => import("./pages/PracticePage"));
const LiveTablePage = lazy(() => import("./pages/LiveTablePage"));
const DrillsPage = lazy(() => import("./pages/DrillsPage"));
const ReviewPage = lazy(() => import("./pages/ReviewPage"));
const ProgressPage = lazy(() => import("./pages/ProgressPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const LearnPage = lazy(() => import("./pages/LearnPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
```

**IMPORTANT**: Each page must have a **default export**. Check each page file — if they use named exports like `export function HomePage()`, add a default export:

```typescript
export default HomePage;
// OR change to: export default function HomePage() { ... }
```

Update each page file to add a default export at the end if not present.

**Step 2: Wrap routes with Suspense**

```tsx
function App() {
    useHydration();

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-dvh bg-neutral-950 text-neutral-400">
                Loading...
            </div>
        }>
            <Routes>
                <Route element={<AppShell />}>
                    <Route index element={<HomePage />} />
                    <Route path="practice" element={<PracticePage />}>
                        <Route path="live" element={<LiveTablePage />} />
                        <Route path="drills" element={<DrillsPage />} />
                    </Route>
                    <Route path="review" element={<ReviewPage />} />
                    <Route path="learn" element={<LearnPage />} />
                    <Route path="progress" element={<ProgressPage />} />
                    <Route path="library" element={<LibraryPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </Suspense>
    );
}
```

**Step 3: Add default exports to all page files**

For each page file that uses a named export, add a default export line at the bottom. Check all files:
- `src/pages/HomePage.tsx`
- `src/pages/PracticePage.tsx`
- `src/pages/LiveTablePage.tsx`
- `src/pages/DrillsPage.tsx`
- `src/pages/ReviewPage.tsx`
- `src/pages/ProgressPage.tsx`
- `src/pages/LibraryPage.tsx`
- `src/pages/LearnPage.tsx`
- `src/pages/SettingsPage.tsx`

For each, if it has `export function XxxPage()`, keep that AND add at end of file: `export default XxxPage;`

**Step 4: Verify build**

Run: `npx tsc --noEmit && npx vite build`
Expected: clean types, build succeeds, JS bundle should be split into multiple chunks

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: ALL tests pass

**Step 6: Commit**

```bash
git add src/App.tsx src/pages/*.tsx
git commit -m "feat(m7): add route-level lazy loading to reduce initial bundle size"
```

---

## Task 12: Final Verification & Type Check

**Files:** None — verification only.

**Step 1: Type check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Full test suite**

Run: `npx vitest run`
Expected: ALL tests pass (should be 277 existing + new tests ≈ 300+)

**Step 3: Build**

Run: `npx vite build`
Expected: Build succeeds. JS bundle should have multiple chunks due to lazy loading.

**Step 4: Manual smoke test checklist (for developer)**

- [ ] `npm run dev` — app loads without console errors
- [ ] Navigate to all routes — no blank pages
- [ ] Play a practice hand → progress persists after refresh
- [ ] Run drills → results persist after refresh
- [ ] Settings page: Export works → downloads JSON file
- [ ] Settings page: Import works → restores data
- [ ] Settings page: Clear → resets everything
- [ ] Drill Setup shows correct spot count with pack-aware filtering
- [ ] Game settings (player count, blinds) persist after refresh

---

## Summary

| Task | Description | New Tests |
|------|-------------|-----------|
| 1 | Install idb-keyval | — |
| 2 | Persistence helpers | ~5 |
| 3 | progressStore persist + hydrate + rebuild + export/import/clear | ~10 |
| 4 | gameStore persist | — |
| 5 | Pack system + core pack | ~7 |
| 6 | Multiway expansion pack | ~5 |
| 7 | drillStore lastFilters + persist + pack-aware | ~2 |
| 8 | DrillSetup pack-aware + lastFilters | — |
| 9 | Hydration hook + App integration | — |
| 10 | Settings page + Data Management UI | — |
| 11 | Route-level lazy loading + default exports | — |
| 12 | Final verification | — |

**Total estimated new tests: ~29**
**Total expected tests: ~306**
