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
