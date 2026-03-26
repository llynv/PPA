import { describe, it, expect } from "vitest";
import { computeSidePots } from "../gameStore";
import type { SidePot } from "../../types/poker";

describe("computeSidePots", () => {
    it("returns single pot when all contributions equal", () => {
        const contributions = { hero: 100, "ai-1": 100, "ai-2": 100 };
        const foldedIds = new Set<string>();
        const pots = computeSidePots(contributions, foldedIds);
        expect(pots).toEqual<SidePot[]>([
            { amount: 300, eligiblePlayerIds: ["hero", "ai-1", "ai-2"] },
        ]);
    });

    it("creates main pot + side pot for unequal all-ins", () => {
        const contributions = { hero: 50, "ai-1": 100, "ai-2": 100 };
        const foldedIds = new Set<string>();
        const pots = computeSidePots(contributions, foldedIds);
        expect(pots).toEqual<SidePot[]>([
            { amount: 150, eligiblePlayerIds: ["hero", "ai-1", "ai-2"] },
            { amount: 100, eligiblePlayerIds: ["ai-1", "ai-2"] },
        ]);
    });

    it("creates cascading side pots for three different all-in amounts", () => {
        const contributions = { hero: 30, "ai-1": 60, "ai-2": 100 };
        const foldedIds = new Set<string>();
        const pots = computeSidePots(contributions, foldedIds);
        expect(pots).toEqual<SidePot[]>([
            { amount: 90, eligiblePlayerIds: ["hero", "ai-1", "ai-2"] },
            { amount: 60, eligiblePlayerIds: ["ai-1", "ai-2"] },
            { amount: 40, eligiblePlayerIds: ["ai-2"] },
        ]);
    });

    it("excludes folded players from pot eligibility", () => {
        const contributions = { hero: 50, "ai-1": 100, "ai-2": 100 };
        const foldedIds = new Set(["hero"]);
        const pots = computeSidePots(contributions, foldedIds);
        expect(pots).toEqual<SidePot[]>([
            { amount: 150, eligiblePlayerIds: ["ai-1", "ai-2"] },
            { amount: 100, eligiblePlayerIds: ["ai-1", "ai-2"] },
        ]);
    });

    it("returns single pot for heads-up equal stacks", () => {
        const contributions = { hero: 200, "ai-1": 200 };
        const foldedIds = new Set<string>();
        const pots = computeSidePots(contributions, foldedIds);
        expect(pots).toEqual<SidePot[]>([
            { amount: 400, eligiblePlayerIds: ["hero", "ai-1"] },
        ]);
    });

    it("handles heads-up unequal all-in (excess returned as side pot)", () => {
        const contributions = { hero: 50, "ai-1": 200 };
        const foldedIds = new Set<string>();
        const pots = computeSidePots(contributions, foldedIds);
        expect(pots).toEqual<SidePot[]>([
            { amount: 100, eligiblePlayerIds: ["hero", "ai-1"] },
            { amount: 150, eligiblePlayerIds: ["ai-1"] },
        ]);
    });
});
