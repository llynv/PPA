import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadAttempts, clearAttempts } from "../../lib/persistence";
import { createEmptyMastery } from "../../lib/progress";
import { useProgressStore } from "../progressStore";
import type { AnalysisData } from "../../types/poker";
import type { DrillResult, DrillSpot, DrillSession } from "../../types/drill";

vi.mock("../../lib/persistence", () => ({
    loadAttempts: vi.fn(() => Promise.resolve([])),
    saveAttempts: vi.fn(() => Promise.resolve()),
    clearAttempts: vi.fn(() => Promise.resolve()),
    ATTEMPTS_KEY: "ppa-attempts-v1",
}));

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

// ── Tests ──────────────────────────────────────────────────────────

describe("progressStore", () => {
    beforeEach(() => {
        // Reset store to initial state
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
    });

    // ── Test 1: Initial state ──────────────────────────────────────

    it("has empty initial state", () => {
        const state = useProgressStore.getState();
        expect(state.conceptMastery).toEqual({});
        expect(state.sessions).toEqual([]);
        expect(state.attempts).toEqual([]);
        expect(state.overallStats.totalHands).toBe(0);
        expect(state.overallStats.totalDrills).toBe(0);
        expect(state.overallStats.overallAccuracy).toBe(0);
    });

    // ── Test 2: recordDrillAttempt — correct attempt ───────────────

    it("recordDrillAttempt creates AttemptRecord, updates mastery, increments totalDrills on correct attempt", () => {
        const spot = mockDrillSpot({ concept: "cbet_value" });
        const result = mockDrillResult({ isCorrect: true, evDelta: 0.5 });

        useProgressStore.getState().recordDrillAttempt(result, spot);

        const state = useProgressStore.getState();
        expect(state.attempts).toHaveLength(1);
        expect(state.attempts[0].source).toBe("drill");
        expect(state.attempts[0].concept).toBe("cbet_value");
        expect(state.attempts[0].isCorrect).toBe(true);
        expect(state.attempts[0].evDelta).toBe(0.5);

        expect(state.conceptMastery["cbet_value"]).toBeDefined();
        expect(state.conceptMastery["cbet_value"].totalAttempts).toBe(1);
        expect(state.conceptMastery["cbet_value"].correctAttempts).toBe(1);
        expect(state.conceptMastery["cbet_value"].accuracy).toBe(1);
        expect(state.conceptMastery["cbet_value"].streak).toBe(1);

        expect(state.overallStats.totalDrills).toBe(1);
    });

    // ── Test 3: recordDrillAttempt — incorrect attempt ─────────────

    it("recordDrillAttempt resets streak and decrements accuracy on incorrect attempt", () => {
        const spot = mockDrillSpot({ concept: "cbet_value" });

        // First: correct
        useProgressStore.getState().recordDrillAttempt(
            mockDrillResult({ isCorrect: true, evDelta: 0.5 }),
            spot
        );
        // Second: correct
        useProgressStore.getState().recordDrillAttempt(
            mockDrillResult({ isCorrect: true, evDelta: 0.3 }),
            spot
        );

        let state = useProgressStore.getState();
        expect(state.conceptMastery["cbet_value"].streak).toBe(2);

        // Third: incorrect
        useProgressStore.getState().recordDrillAttempt(
            mockDrillResult({ isCorrect: false, evDelta: -0.5 }),
            spot
        );

        state = useProgressStore.getState();
        expect(state.conceptMastery["cbet_value"].streak).toBe(0);
        expect(state.conceptMastery["cbet_value"].bestStreak).toBe(2);
        expect(state.conceptMastery["cbet_value"].accuracy).toBeCloseTo(2 / 3);
        expect(state.conceptMastery["cbet_value"].totalAttempts).toBe(3);
    });

    // ── Test 4: recordDrillAttempt — mastery level progression ─────

    it("recordDrillAttempt transitions mastery from unseen → learning → practiced over 5 correct attempts", () => {
        const spot = mockDrillSpot({ concept: "barrel" });

        // Initially unseen (no entry)
        expect(useProgressStore.getState().conceptMastery["barrel"]).toBeUndefined();

        // After 1 correct attempt → learning (totalAttempts < 5)
        useProgressStore.getState().recordDrillAttempt(
            mockDrillResult({ isCorrect: true, evDelta: 0.1 }),
            spot
        );
        expect(useProgressStore.getState().conceptMastery["barrel"].level).toBe("learning");

        // After 4 more correct attempts (5 total) → practiced
        // (totalAttempts=5, accuracy=1.0, recentAccuracy=1.0 >= 0.4 but < 0.6 won't apply —
        //  actually recentAccuracy=1.0 >= 0.6 → solid? Let's check: computeMasteryLevel
        //  with accuracy >= 0.4, totalAttempts >= 5, recentAccuracy >= 0.6 → solid
        //  BUT recentAccuracy=1.0 >= 0.8, totalAttempts=5 < 15 → solid)
        for (let i = 0; i < 4; i++) {
            useProgressStore.getState().recordDrillAttempt(
                mockDrillResult({ isCorrect: true, evDelta: 0.1 }),
                spot
            );
        }
        const mastery = useProgressStore.getState().conceptMastery["barrel"];
        expect(mastery.totalAttempts).toBe(5);
        // With 5/5 correct: accuracy=1.0, recentAccuracy=1.0 ≥ 0.6 → "solid" (not enough for mastered: needs 15 attempts)
        expect(["practiced", "solid"]).toContain(mastery.level);
        // More specifically: recentAccuracy=1.0 ≥ 0.6, so passes "practiced" threshold into "solid"
        expect(mastery.level).toBe("solid");
    });

    // ── Test 5: recordDrillSession ─────────────────────────────────

    it("recordDrillSession creates SessionSummary with correct aggregates", () => {
        const spots: DrillSpot[] = [
            mockDrillSpot({ id: "s1", concept: "cbet_value" }),
            mockDrillSpot({ id: "s2", concept: "barrel" }),
        ];

        const session: DrillSession = {
            allSpots: spots,
            queue: spots,
            currentIndex: 2,
            results: [
                mockDrillResult({ spotId: "s1", isCorrect: true, evDelta: 0.5 }),
                mockDrillResult({ spotId: "s2", isCorrect: false, evDelta: -1.0 }),
            ],
            filters: { categories: [], difficulties: [], concepts: [] },
            streak: 0,
            bestStreak: 1,
        };

        useProgressStore.getState().recordDrillSession(session);

        const state = useProgressStore.getState();
        expect(state.sessions).toHaveLength(1);
        expect(state.sessions[0].type).toBe("drill");
        expect(state.sessions[0].handsPlayed).toBe(2);
        expect(state.sessions[0].accuracy).toBe(0.5);
        expect(state.sessions[0].totalEvDelta).toBeCloseTo(-0.5);
        expect(state.sessions[0].weakestConcept).toBe("barrel");
    });

    // ── Test 6: recordLiveHand — AttemptRecords for mistakes and clean decisions

    it("recordLiveHand creates AttemptRecords for mistakes (isCorrect: false) and clean decisions (isCorrect: true)", () => {
        const analysis = mockAnalysis({
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
                    heroAction: "bet",
                    optimalAction: "bet",
                    optimalFrequencies: { fold: 0, call: 0, raise: 1 },
                    evDiff: 0,
                    heroEv: 2.0,
                },
                {
                    round: "turn",
                    heroAction: "check",
                    optimalAction: "bet",
                    optimalFrequencies: { fold: 0, call: 0, raise: 1 },
                    evDiff: -3.0,
                },
            ],
            mistakes: [
                {
                    round: "turn",
                    description: "Missed value bet",
                    severity: "major",
                    evLoss: 3.0,
                    heroAction: "check",
                    optimalAction: "bet",
                    type: "MISSED_VALUE_BET",
                },
            ],
        });

        useProgressStore.getState().recordLiveHand(analysis);

        const state = useProgressStore.getState();
        // 1 mistake + 2 clean decisions = 3 attempts
        expect(state.attempts).toHaveLength(3);

        // Mistake attempt
        const mistakeAttempt = state.attempts.find((a) => !a.isCorrect);
        expect(mistakeAttempt).toBeDefined();
        expect(mistakeAttempt!.concept).toBe("MISSED_VALUE_BET");
        expect(mistakeAttempt!.evDelta).toBe(-3.0);
        expect(mistakeAttempt!.source).toBe("live");

        // Clean decisions
        const correctAttempts = state.attempts.filter((a) => a.isCorrect);
        expect(correctAttempts).toHaveLength(2);
        expect(correctAttempts.map((a) => a.concept).sort()).toEqual(
            ["cbet_value", "open_raise"].sort()
        );
    });

    // ── Test 7: recordLiveHand — stats and session ─────────────────

    it("recordLiveHand increments totalHands and creates live SessionSummary", () => {
        const analysis = mockAnalysis();

        useProgressStore.getState().recordLiveHand(analysis);

        const state = useProgressStore.getState();
        expect(state.overallStats.totalHands).toBe(1);
        expect(state.sessions).toHaveLength(1);
        expect(state.sessions[0].type).toBe("live");
        expect(state.sessions[0].handsPlayed).toBe(1);
        expect(state.sessions[0].averageGrade).toBe("B");
    });

    // ── Test 8: getWeakestConcepts ─────────────────────────────────

    it("getWeakestConcepts returns concepts sorted by recentAccuracy ascending", () => {
        // Seed 3 concepts with different accuracies
        // "barrel" — all correct (high accuracy)
        for (let i = 0; i < 3; i++) {
            useProgressStore.getState().recordDrillAttempt(
                mockDrillResult({ isCorrect: true, evDelta: 0.1 }),
                mockDrillSpot({ concept: "barrel" })
            );
        }

        // "cbet_value" — mixed (medium accuracy)
        useProgressStore.getState().recordDrillAttempt(
            mockDrillResult({ isCorrect: true, evDelta: 0.1 }),
            mockDrillSpot({ concept: "cbet_value" })
        );
        useProgressStore.getState().recordDrillAttempt(
            mockDrillResult({ isCorrect: false, evDelta: -0.5 }),
            mockDrillSpot({ concept: "cbet_value" })
        );

        // "open_raise" — all incorrect (low accuracy)
        for (let i = 0; i < 3; i++) {
            useProgressStore.getState().recordDrillAttempt(
                mockDrillResult({ isCorrect: false, evDelta: -0.5 }),
                mockDrillSpot({ concept: "open_raise" })
            );
        }

        const weakest = useProgressStore.getState().getWeakestConcepts(3);
        expect(weakest).toHaveLength(3);
        expect(weakest[0].concept).toBe("open_raise"); // 0%
        expect(weakest[1].concept).toBe("cbet_value"); // 50%
        expect(weakest[2].concept).toBe("barrel"); // 100%
    });

    // ── Test 9: getStrongestConcepts ───────────────────────────────

    it("getStrongestConcepts returns sorted descending and excludes unseen", () => {
        // Seed concepts
        for (let i = 0; i < 3; i++) {
            useProgressStore.getState().recordDrillAttempt(
                mockDrillResult({ isCorrect: true, evDelta: 0.1 }),
                mockDrillSpot({ concept: "barrel" })
            );
        }
        useProgressStore.getState().recordDrillAttempt(
            mockDrillResult({ isCorrect: true, evDelta: 0.1 }),
            mockDrillSpot({ concept: "cbet_value" })
        );
        useProgressStore.getState().recordDrillAttempt(
            mockDrillResult({ isCorrect: false, evDelta: -0.5 }),
            mockDrillSpot({ concept: "cbet_value" })
        );

        const strongest = useProgressStore.getState().getStrongestConcepts(5);
        expect(strongest).toHaveLength(2); // Only 2 concepts have attempts
        expect(strongest[0].concept).toBe("barrel"); // 100%
        expect(strongest[1].concept).toBe("cbet_value"); // 50%
    });

    // ── Test 10: getRecentSessions ─────────────────────────────────

    it("getRecentSessions returns most recent n sessions", () => {
        // Create 3 sessions via live hands
        useProgressStore.getState().recordLiveHand(mockAnalysis({ handNumber: 1 }));
        useProgressStore.getState().recordLiveHand(mockAnalysis({ handNumber: 2, heroGrade: "A" }));
        useProgressStore.getState().recordLiveHand(mockAnalysis({ handNumber: 3, heroGrade: "D" }));

        const recent = useProgressStore.getState().getRecentSessions(2);
        expect(recent).toHaveLength(2);
        // Most recent first (reversed)
        expect(recent[0].averageGrade).toBe("D");
        expect(recent[1].averageGrade).toBe("A");
    });

    // ── Test 11: getMasteryDistribution ────────────────────────────

    it("getMasteryDistribution counts concepts per level correctly", () => {
        // Seed: "barrel" with many correct → solid, "open_raise" with 1 attempt → learning
        for (let i = 0; i < 8; i++) {
            useProgressStore.getState().recordDrillAttempt(
                mockDrillResult({ isCorrect: true, evDelta: 0.1 }),
                mockDrillSpot({ concept: "barrel" })
            );
        }

        useProgressStore.getState().recordDrillAttempt(
            mockDrillResult({ isCorrect: true, evDelta: 0.1 }),
            mockDrillSpot({ concept: "open_raise" })
        );

        const dist = useProgressStore.getState().getMasteryDistribution();
        // barrel: 8 correct, accuracy=1.0, recentAccuracy=1.0 → solid (needs 15 for mastered)
        // open_raise: 1 correct, totalAttempts=1 < 5 → learning
        expect(dist.solid).toBe(1);
        expect(dist.learning).toBe(1);
        expect(dist.unseen).toBe(0);
        expect(dist.practiced).toBe(0);
        expect(dist.mastered).toBe(0);
    });

    // ── Test 12: overallStats streak tracking ─────────────────────

    it("tracks currentStreak and bestStreak across drill attempts", () => {
        const spot = mockDrillSpot({ concept: "cbet_value" });

        // 3 correct → streak=3
        for (let i = 0; i < 3; i++) {
            useProgressStore.getState().recordDrillAttempt(
                mockDrillResult({ isCorrect: true, evDelta: 0.1 }),
                spot
            );
        }
        let state = useProgressStore.getState();
        expect(state.overallStats.currentStreak).toBe(3);
        expect(state.overallStats.bestStreak).toBe(3);

        // 1 incorrect → streak resets
        useProgressStore.getState().recordDrillAttempt(
            mockDrillResult({ isCorrect: false, evDelta: -0.5 }),
            spot
        );
        state = useProgressStore.getState();
        expect(state.overallStats.currentStreak).toBe(0);
        // bestStreak retained
        expect(state.overallStats.bestStreak).toBe(3);

        // 1 more correct → streak=1, bestStreak still 3
        useProgressStore.getState().recordDrillAttempt(
            mockDrillResult({ isCorrect: true, evDelta: 0.1 }),
            spot
        );
        state = useProgressStore.getState();
        expect(state.overallStats.currentStreak).toBe(1);
        expect(state.overallStats.bestStreak).toBe(3);
    });

    // ── Test 13: same-round decision matching ─────────────────────

    it("recordLiveHand correctly handles two decisions on the same round where only one is a mistake", () => {
        const analysis = mockAnalysis({
            decisions: [
                {
                    round: "flop",
                    heroAction: "call",
                    optimalAction: "call",
                    optimalFrequencies: { fold: 0.1, call: 0.7, raise: 0.2 },
                    evDiff: 0,
                    heroEv: 1.0,
                },
                {
                    round: "flop",
                    heroAction: "raise",
                    optimalAction: "fold",
                    optimalFrequencies: { fold: 0.8, call: 0.1, raise: 0.1 },
                    evDiff: -5.0,
                },
            ],
            mistakes: [
                {
                    round: "flop",
                    description: "Bad raise",
                    severity: "major",
                    evLoss: 5.0,
                    heroAction: "raise",
                    optimalAction: "fold",
                    type: "BLUFF_WRONG_SPOT",
                },
            ],
        });

        useProgressStore.getState().recordLiveHand(analysis);

        const state = useProgressStore.getState();
        // 1 mistake (raise) + 1 clean decision (call) = 2 attempts
        expect(state.attempts).toHaveLength(2);

        const mistakeAttempt = state.attempts.find((a) => !a.isCorrect);
        expect(mistakeAttempt).toBeDefined();
        expect(mistakeAttempt!.concept).toBe("BLUFF_WRONG_SPOT");

        const correctAttempt = state.attempts.find((a) => a.isCorrect);
        expect(correctAttempt).toBeDefined();
        expect(correctAttempt!.concept).toBe("check_call"); // inferLiveHandConcept for call
    });
});

describe("hydration", () => {
    beforeEach(() => {
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
            isHydrated: false,
        });
    });

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
    beforeEach(() => {
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
            isHydrated: false,
        });
    });

    it("reconstructs conceptMastery from raw attempts", () => {
        const { recordDrillAttempt } = useProgressStore.getState();
        const spot = mockDrillSpot({ concept: "cbet_value" });

        recordDrillAttempt(mockDrillResult({ isCorrect: true, evDelta: 0 }), spot);
        recordDrillAttempt(mockDrillResult({ isCorrect: true, evDelta: 0 }), spot);
        recordDrillAttempt(mockDrillResult({ isCorrect: true, evDelta: 0 }), spot);
        recordDrillAttempt(mockDrillResult({ isCorrect: false, evDelta: 0 }), spot);

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
    beforeEach(() => {
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
            isHydrated: false,
        });
    });

    it("exports all data as JSON string", async () => {
        const { recordDrillAttempt } = useProgressStore.getState();
        recordDrillAttempt(mockDrillResult(), mockDrillSpot());
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
        expect(state.conceptMastery["open_raise"]).toBeDefined();
        expect(state.conceptMastery["open_raise"]!.totalAttempts).toBe(2);
    });

    it("importData rejects invalid JSON", async () => {
        await expect(useProgressStore.getState().importData("not json")).rejects.toThrow();
    });

    it("importData rejects wrong app field", async () => {
        const bad = JSON.stringify({ version: 1, app: "wrong", data: {} });
        await expect(useProgressStore.getState().importData(bad)).rejects.toThrow("Invalid backup file");
    });
});

describe("clearAllData", () => {
    beforeEach(() => {
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
            isHydrated: false,
        });
    });

    it("resets all state and clears IndexedDB", async () => {
        const { recordDrillAttempt } = useProgressStore.getState();
        recordDrillAttempt(mockDrillResult(), mockDrillSpot());
        await useProgressStore.getState().clearAllData();
        const state = useProgressStore.getState();
        expect(state.attempts).toEqual([]);
        expect(state.conceptMastery).toEqual({});
        expect(state.sessions).toEqual([]);
        expect(state.overallStats.totalDrills).toBe(0);
        expect(clearAttempts).toHaveBeenCalled();
    });
});
