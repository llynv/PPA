import { describe, it, expect, beforeEach } from "vitest";
import { useProgressStore } from "../../store/progressStore";
import { isTierUnlocked, recommendNextConcept } from "../learning-path";
import { CURRICULUM } from "../../data/curriculum";
import type { DrillResult, DrillSpot, DrillConcept } from "../../types/drill";

// ── Helpers ────────────────────────────────────────────────────────

function mockDrillSpot(concept: DrillConcept): DrillSpot {
    return {
        id: "test-spot",
        name: "Test Spot",
        category: "preflop",
        difficulty: 1,
        description: "Test",
        concept,
        tags: [],
        heroCards: [
            { suit: "hearts", rank: "A" },
            { suit: "spades", rank: "K" },
        ],
        communityCards: [],
        potSize: 100,
        heroStack: 500,
        villainStack: 500,
        heroPosition: "BTN",
        villainPosition: "BB",
        previousActions: "",
        decisionContext: {
            holeCards: [
                { suit: "hearts", rank: "A" },
                { suit: "spades", rank: "K" },
            ],
            communityCards: [],
            position: "BTN",
            round: "preflop",
            pot: 100,
            toCall: 0,
            currentBet: 0,
            stack: 500,
            bigBlind: 2,
            numActivePlayers: 2,
            numPlayersInHand: 2,
            isFirstToAct: true,
            facingRaise: false,
            actionHistory: [],
        },
    } as DrillSpot;
}

function mockDrillResult(isCorrect: boolean): DrillResult {
    return {
        spotId: "test-spot",
        heroAction: isCorrect ? "raise" : "fold",
        isCorrect,
        evDelta: isCorrect ? 0.5 : -0.5,
        optimalResult: {
            optimalAction: "raise",
            frequencies: { fold: 0, call: 0, raise: 1 },
            reasoning: "test",
            equity: 0.6,
            potOdds: 0.3,
            impliedOdds: 0,
            spr: 5,
            draws: {
                flushDraw: false,
                flushDrawOuts: 0,
                oesD: false,
                gutshot: false,
                straightDrawOuts: 0,
                backdoorFlush: false,
                backdoorStraight: false,
                totalOuts: 0,
                drawEquity: 0,
            },
            boardTexture: {
                wetness: "dry",
                isMonotone: false,
                isTwoTone: false,
                isRainbow: true,
                isPaired: false,
                isTrips: false,
                highCardCount: 1,
                connectedness: 0,
                possibleStraights: 0,
                possibleFlushes: false,
            },
            evByAction: { fold: -1, call: 0.2, raise: 0.5 },
        },
        timestamp: Date.now(),
    };
}

function recordAttempts(concept: DrillConcept, count: number, isCorrect: boolean) {
    const spot = mockDrillSpot(concept);
    for (let i = 0; i < count; i++) {
        useProgressStore.getState().recordDrillAttempt(mockDrillResult(isCorrect), spot);
    }
}

// ── Integration Tests ──────────────────────────────────────────────

describe("learning-path integration with progressStore", () => {
    beforeEach(() => {
        useProgressStore.setState(useProgressStore.getInitialState(), true);
    });

    it("Tier 2 unlocks after 2 Foundations concepts reach practiced via real drill attempts", () => {
        // Tier 2 requires 2 concepts at practiced+ in Tier 1
        // practiced needs: totalAttempts >= 5 AND accuracy >= 0.4 AND recentAccuracy < 0.6
        // Record 5 correct attempts for open_raise → accuracy = 1.0, recentAccuracy = 1.0
        // That gives solid (recentAccuracy >= 0.6), which is practiced+
        recordAttempts("open_raise", 5, true);
        recordAttempts("cold_call", 5, true);

        const mastery = useProgressStore.getState().conceptMastery;

        // Both should be at practiced+ (solid or practiced)
        expect(isTierUnlocked(CURRICULUM[0], mastery)).toBe(true); // Tier 1 always unlocked
        expect(isTierUnlocked(CURRICULUM[1], mastery)).toBe(true); // Tier 2 now unlocked
    });

    it("recommendation adapts from open_raise to next unseen concept after mastery progresses", () => {
        // With empty mastery, recommendation should be open_raise (first Foundations concept)
        const emptyMastery = useProgressStore.getState().conceptMastery;
        expect(recommendNextConcept(emptyMastery)).toBe("open_raise");

        // Record 5 correct attempts for open_raise
        recordAttempts("open_raise", 5, true);

        // Now open_raise has mastery → recommendation should move to next unseen Foundations concept
        const updatedMastery = useProgressStore.getState().conceptMastery;
        expect(recommendNextConcept(updatedMastery)).toBe("cold_call");
    });

    it("recommendation advances to Tier 2 first concept after all 3 Foundations reach solid", () => {
        // Push all 3 Foundations concepts to solid:
        // solid requires: totalAttempts >= 5, accuracy >= 0.4, recentAccuracy >= 0.6 (but < 0.8 or streak < 3 or totalAttempts < 15)
        // 5 correct attempts → accuracy=1.0, recentAccuracy=1.0, streak=5, totalAttempts=5
        // With totalAttempts < 15, won't reach mastered. recentAccuracy >= 0.6 → solid
        recordAttempts("open_raise", 5, true);
        recordAttempts("cold_call", 5, true);
        recordAttempts("steal", 5, true);

        const mastery = useProgressStore.getState().conceptMastery;

        // Verify all 3 are at solid level
        expect(mastery["open_raise"].level).toBe("solid");
        expect(mastery["cold_call"].level).toBe("solid");
        expect(mastery["steal"].level).toBe("solid");

        // No unseen in Tier 1, Tier 2 is unlocked → recommendation should be first Tier 2 concept
        expect(recommendNextConcept(mastery)).toBe("cbet_value");
    });
});
