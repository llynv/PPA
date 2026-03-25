import { describe, it, expect, beforeEach } from "vitest";
import { useProgressStore } from "../progressStore";
import { useDrillStore } from "../drillStore";
import type { AnalysisData } from "../../types/poker";
import type { DrillSpot, DrillResult } from "../../types/drill";

// ── Helpers ────────────────────────────────────────────────────────

function mockAnalysis(overrides?: Partial<AnalysisData>): AnalysisData {
    return {
        heroGrade: "B",
        decisions: [
            {
                round: "flop",
                heroAction: "call",
                optimalAction: "call",
                optimalFrequencies: { fold: 0.1, call: 0.7, raise: 0.2 },
                evDiff: 0,
                heroEv: 1.0,
            },
        ],
        totalEvLoss: 2.5,
        totalHeroEv: 1.0,
        mistakes: [],
        handNumber: 1,
        ...overrides,
    };
}

function mockDrillSpot(overrides?: Partial<DrillSpot>): DrillSpot {
    return {
        id: "spot-1",
        name: "Test Spot",
        category: "flop",
        difficulty: 1,
        description: "Test",
        concept: "cbet_value",
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
            round: "flop",
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
        ...overrides,
    } as DrillSpot;
}

function mockDrillResult(overrides?: Partial<DrillResult>): DrillResult {
    return {
        spotId: "spot-1",
        heroAction: "bet",
        isCorrect: true,
        evDelta: 0.5,
        optimalResult: {
            optimalAction: "bet",
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
        ...overrides,
    };
}

function resetAllStores() {
    useProgressStore.setState({
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
    });
    useDrillStore.setState({
        phase: "setup",
        session: null,
        currentResult: null,
    });
}

// ── Integration Tests ──────────────────────────────────────────────

describe("progressStore integration", () => {
    beforeEach(() => {
        resetAllStores();
    });

    // ── Test 1: Live hand → progress update ───────────────────────
    it("live hand with mistakes correctly updates progressStore via recordLiveHand", () => {
        const analysis = mockAnalysis({
            heroGrade: "C+",
            decisions: [
                {
                    round: "preflop",
                    heroAction: "raise",
                    optimalAction: "raise",
                    optimalFrequencies: { fold: 0, call: 0.2, raise: 0.8 },
                    evDiff: 0,
                    heroEv: 1.5,
                },
                {
                    round: "flop",
                    heroAction: "check",
                    optimalAction: "bet",
                    optimalFrequencies: { fold: 0, call: 0, raise: 1 },
                    evDiff: -4.0,
                },
                {
                    round: "turn",
                    heroAction: "call",
                    optimalAction: "call",
                    optimalFrequencies: { fold: 0.2, call: 0.6, raise: 0.2 },
                    evDiff: 0,
                    heroEv: 0.8,
                },
            ],
            mistakes: [
                {
                    round: "flop",
                    description: "Missed c-bet",
                    severity: "major",
                    evLoss: 4.0,
                    heroAction: "check",
                    optimalAction: "bet",
                    type: "MISSED_CBET",
                },
            ],
            totalEvLoss: 4.0,
            totalHeroEv: 2.3,
        });

        // Simulate the same call that gameStore.viewAnalysis() makes
        useProgressStore.getState().recordLiveHand(analysis);

        const state = useProgressStore.getState();

        // Should have 3 attempts: 1 mistake + 2 clean decisions
        expect(state.attempts).toHaveLength(3);

        // Verify the mistake attempt
        const mistakeAttempts = state.attempts.filter((a) => !a.isCorrect);
        expect(mistakeAttempts).toHaveLength(1);
        expect(mistakeAttempts[0].concept).toBe("MISSED_CBET");
        expect(mistakeAttempts[0].evDelta).toBe(-4.0);
        expect(mistakeAttempts[0].source).toBe("live");
        expect(mistakeAttempts[0].grade).toBe("C+");

        // Verify clean decision attempts
        const correctAttempts = state.attempts.filter((a) => a.isCorrect);
        expect(correctAttempts).toHaveLength(2);
        const concepts = correctAttempts.map((a) => a.concept).sort();
        expect(concepts).toEqual(["check_call", "open_raise"]);

        // Verify ConceptMastery was created for each concept
        expect(state.conceptMastery["MISSED_CBET"]).toBeDefined();
        expect(state.conceptMastery["MISSED_CBET"].totalAttempts).toBe(1);
        expect(state.conceptMastery["MISSED_CBET"].accuracy).toBe(0);
        expect(state.conceptMastery["open_raise"]).toBeDefined();
        expect(state.conceptMastery["open_raise"].accuracy).toBe(1);
        expect(state.conceptMastery["check_call"]).toBeDefined();
        expect(state.conceptMastery["check_call"].accuracy).toBe(1);

        // Verify session summary
        expect(state.sessions).toHaveLength(1);
        expect(state.sessions[0].type).toBe("live");
        expect(state.sessions[0].averageGrade).toBe("C+");
        expect(state.sessions[0].handsPlayed).toBe(1);

        // Verify overall stats
        expect(state.overallStats.totalHands).toBe(1);
        expect(state.overallStats.averageGrade).toBe("C+");
    });

    // ── Test 2: Drill attempts → mastery progression ──────────────
    it("submitting 15+ correct drill attempts progresses mastery through learning → solid → mastered", () => {
        const spot = mockDrillSpot({ concept: "three_bet" });

        // After 1 attempt → learning (totalAttempts < 5)
        useProgressStore.getState().recordDrillAttempt(
            mockDrillResult({ isCorrect: true, evDelta: 0.2 }),
            spot
        );
        expect(useProgressStore.getState().conceptMastery["three_bet"].level).toBe("learning");

        // After 5 total correct → solid (accuracy=1.0, recentAccuracy=1.0 ≥ 0.6, totalAttempts < 15)
        for (let i = 0; i < 4; i++) {
            useProgressStore.getState().recordDrillAttempt(
                mockDrillResult({ isCorrect: true, evDelta: 0.2 }),
                spot
            );
        }
        let mastery = useProgressStore.getState().conceptMastery["three_bet"];
        expect(mastery.totalAttempts).toBe(5);
        expect(mastery.level).toBe("solid");

        // After 15 total correct with streak ≥ 3 → mastered
        for (let i = 0; i < 10; i++) {
            useProgressStore.getState().recordDrillAttempt(
                mockDrillResult({ isCorrect: true, evDelta: 0.2 }),
                spot
            );
        }
        mastery = useProgressStore.getState().conceptMastery["three_bet"];
        expect(mastery.totalAttempts).toBe(15);
        expect(mastery.accuracy).toBe(1);
        expect(mastery.recentAccuracy).toBeGreaterThanOrEqual(0.8);
        expect(mastery.streak).toBe(15);
        expect(mastery.level).toBe("mastered");

        // Verify overall stats tracked all drills
        const stats = useProgressStore.getState().overallStats;
        expect(stats.totalDrills).toBe(15);
        expect(stats.overallAccuracy).toBe(1);
        expect(stats.bestStreak).toBe(15);
    });

    // ── Test 3: Drill session → session summary ───────────────────
    it("completing a full drill session creates a SessionSummary with correct aggregates", () => {
        const spots: DrillSpot[] = [
            mockDrillSpot({ id: "s1", concept: "cbet_value" }),
            mockDrillSpot({ id: "s2", concept: "barrel" }),
            mockDrillSpot({ id: "s3", concept: "cbet_value" }),
        ];

        const results: DrillResult[] = [
            mockDrillResult({ spotId: "s1", isCorrect: true, evDelta: 0.5 }),
            mockDrillResult({ spotId: "s2", isCorrect: false, evDelta: -1.0 }),
            mockDrillResult({ spotId: "s3", isCorrect: true, evDelta: 0.3 }),
        ];

        // Record individual drill attempts first (as drillStore.submitAnswer does)
        for (let i = 0; i < results.length; i++) {
            useProgressStore.getState().recordDrillAttempt(results[i], spots[i]);
        }

        // Then record the complete session (as drillStore.nextSpot does at end)
        const session = {
            allSpots: spots,
            queue: spots,
            currentIndex: 3,
            results,
            filters: { categories: [], difficulties: [], concepts: [] },
            streak: 1,
            bestStreak: 1,
        };
        useProgressStore.getState().recordDrillSession(session as any);

        const state = useProgressStore.getState();

        // Verify session summary
        expect(state.sessions).toHaveLength(1);
        const summary = state.sessions[0];
        expect(summary.type).toBe("drill");
        expect(summary.handsPlayed).toBe(3);
        expect(summary.accuracy).toBeCloseTo(2 / 3);
        expect(summary.totalEvDelta).toBeCloseTo(-0.2); // 0.5 + (-1.0) + 0.3

        // weakestConcept: barrel (0% accuracy in session) vs cbet_value (100%)
        expect(summary.weakestConcept).toBe("barrel");

        // Verify individual attempts were recorded
        expect(state.attempts).toHaveLength(3);
        expect(state.overallStats.totalDrills).toBe(3);

        // Verify concept mastery reflects the results
        expect(state.conceptMastery["cbet_value"].totalAttempts).toBe(2);
        expect(state.conceptMastery["cbet_value"].correctAttempts).toBe(2);
        expect(state.conceptMastery["barrel"].totalAttempts).toBe(1);
        expect(state.conceptMastery["barrel"].correctAttempts).toBe(0);
    });

    // ── Test 4: Weakness query accuracy ───────────────────────────
    it("getWeakestConcepts returns correct two weakest after mixed attempts across 3 concepts", () => {
        // Concept A: "open_raise" — 1/4 correct = 25% accuracy
        const spotA = mockDrillSpot({ concept: "open_raise" });
        useProgressStore.getState().recordDrillAttempt(
            mockDrillResult({ isCorrect: true, evDelta: 0.1 }), spotA
        );
        for (let i = 0; i < 3; i++) {
            useProgressStore.getState().recordDrillAttempt(
                mockDrillResult({ isCorrect: false, evDelta: -0.3 }), spotA
            );
        }

        // Concept B: "cbet_bluff" — 3/5 correct = 60% accuracy
        const spotB = mockDrillSpot({ concept: "cbet_bluff" });
        for (let i = 0; i < 3; i++) {
            useProgressStore.getState().recordDrillAttempt(
                mockDrillResult({ isCorrect: true, evDelta: 0.2 }), spotB
            );
        }
        for (let i = 0; i < 2; i++) {
            useProgressStore.getState().recordDrillAttempt(
                mockDrillResult({ isCorrect: false, evDelta: -0.2 }), spotB
            );
        }

        // Concept C: "pot_control" — 5/5 correct = 100% accuracy
        const spotC = mockDrillSpot({ concept: "pot_control" });
        for (let i = 0; i < 5; i++) {
            useProgressStore.getState().recordDrillAttempt(
                mockDrillResult({ isCorrect: true, evDelta: 0.1 }), spotC
            );
        }

        const weakest = useProgressStore.getState().getWeakestConcepts(2);

        expect(weakest).toHaveLength(2);
        // Weakest first (lowest recentAccuracy)
        expect(weakest[0].concept).toBe("open_raise");
        expect(weakest[1].concept).toBe("cbet_bluff");

        // Verify pot_control is NOT in the weakest 2
        expect(weakest.every((m) => m.concept !== "pot_control")).toBe(true);

        // Verify recentAccuracy ordering
        expect(weakest[0].recentAccuracy).toBeLessThan(weakest[1].recentAccuracy);
    });
});
