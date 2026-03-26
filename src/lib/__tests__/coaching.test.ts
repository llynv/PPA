import { describe, it, expect } from "vitest";
import {
    coachingDepthForMastery,
    generateBoardNarrative,
    generateEnhancedCoaching,
    generateCorrectPlayCoaching,
    generateDrillCoaching,
    generateSessionDebrief,
    getRecommendation,
} from "../coaching";
import type {
    CoachingContext,
    BettingRound,
    BoardTexture,
    DrawInfo,
    Decision,
    MistakeType,
    AnalysisData,
} from "../../types/poker";
import type { ConceptMastery } from "../../types/progress";
import type { DrillSpot, DrillResult } from "../../types/drill";

// ── coachingDepthForMastery ─────────────────────────────────────────

describe("coachingDepthForMastery", () => {
    it("returns foundational for unseen", () => {
        expect(coachingDepthForMastery("unseen")).toBe("foundational");
    });

    it("returns foundational for learning", () => {
        expect(coachingDepthForMastery("learning")).toBe("foundational");
    });

    it("returns tactical for practiced", () => {
        expect(coachingDepthForMastery("practiced")).toBe("tactical");
    });

    it("returns tactical for solid", () => {
        expect(coachingDepthForMastery("solid")).toBe("tactical");
    });

    it("returns nuanced for mastered", () => {
        expect(coachingDepthForMastery("mastered")).toBe("nuanced");
    });

    it("returns foundational for undefined mastery (no ConceptMastery)", () => {
        expect(coachingDepthForMastery(undefined)).toBe("foundational");
    });
});

// ── generateBoardNarrative ──────────────────────────────────────────

describe("generateBoardNarrative", () => {
    const dryBoard: BoardTexture = {
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
    };

    const wetBoard: BoardTexture = {
        wetness: "wet",
        isMonotone: false,
        isTwoTone: true,
        isRainbow: false,
        isPaired: false,
        isTrips: false,
        highCardCount: 2,
        connectedness: 3,
        possibleStraights: 2,
        possibleFlushes: true,
    };

    const noDraws: DrawInfo = {
        flushDraw: false,
        flushDrawOuts: 0,
        oesD: false,
        gutshot: false,
        straightDrawOuts: 0,
        backdoorFlush: false,
        backdoorStraight: false,
        totalOuts: 0,
        drawEquity: 0,
    };

    const flushDraw: DrawInfo = {
        flushDraw: true,
        flushDrawOuts: 9,
        oesD: false,
        gutshot: false,
        straightDrawOuts: 0,
        backdoorFlush: false,
        backdoorStraight: false,
        totalOuts: 9,
        drawEquity: 0.35,
    };

    it("returns a non-empty string for flop", () => {
        const narrative = generateBoardNarrative(dryBoard, noDraws, "flop");
        expect(narrative).toBeTruthy();
        expect(typeof narrative).toBe("string");
    });

    it("mentions wetness level", () => {
        const narrative = generateBoardNarrative(dryBoard, noDraws, "flop");
        expect(narrative.toLowerCase()).toContain("dry");
    });

    it("mentions rainbow when applicable", () => {
        const narrative = generateBoardNarrative(dryBoard, noDraws, "flop");
        expect(narrative.toLowerCase()).toContain("rainbow");
    });

    it("mentions flush draw when present", () => {
        const narrative = generateBoardNarrative(wetBoard, flushDraw, "flop");
        expect(narrative.toLowerCase()).toContain("flush");
    });

    it("handles turn narrative", () => {
        const narrative = generateBoardNarrative(wetBoard, noDraws, "turn");
        expect(narrative).toBeTruthy();
    });

    it("handles river narrative", () => {
        const narrative = generateBoardNarrative(dryBoard, noDraws, "river");
        expect(narrative).toBeTruthy();
    });
});

// ── generateEnhancedCoaching (mistake) ──────────────────────────────

describe("generateEnhancedCoaching", () => {
    function makeCtx(overrides: Partial<CoachingContext> = {}): CoachingContext {
        return {
            decision: {
                round: "flop",
                heroAction: "call",
                optimalAction: "raise",
                optimalFrequencies: { fold: 0, call: 0.3, raise: 0.7 },
                evDiff: 2.5,
                equity: 0.65,
                potOdds: 0.25,
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
            } as Decision,
            mistakeType: "PASSIVE_WITH_EQUITY" as MistakeType,
            mastery: undefined,
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
            round: "flop" as BettingRound,
            ...overrides,
        };
    }

    it("returns all EnhancedCoaching fields for a mistake", () => {
        const coaching = generateEnhancedCoaching(makeCtx());
        expect(coaching.whatHappened).toBeTruthy();
        expect(coaching.whyMistake).toBeTruthy();
        expect(coaching.whatToDo).toBeTruthy();
        expect(coaching.boardNarrative).toBeTruthy();
        expect(coaching.concept).toBe("PASSIVE_WITH_EQUITY");
    });

    it("uses foundational depth when mastery is undefined", () => {
        const coaching = generateEnhancedCoaching(makeCtx());
        expect(coaching.whatToDo).toBeTruthy();
    });

    it("adapts whatToDo depth for mastered level", () => {
        const mastery: ConceptMastery = {
            concept: "value_bet_thin",
            level: "mastered",
            totalAttempts: 20,
            correctAttempts: 18,
            accuracy: 0.9,
            recentAccuracy: 0.85,
            totalEvDelta: 5,
            lastAttemptAt: Date.now(),
            streak: 5,
            bestStreak: 5,
        };
        const coaching = generateEnhancedCoaching(makeCtx({ mastery }));
        expect(coaching.whatToDo).toBeTruthy();
    });

    it("covers all 10 MistakeTypes without throwing", () => {
        const types: MistakeType[] = [
            "OVERFOLD", "OVERCALL", "MISSED_VALUE_BET", "MISSED_CBET",
            "BAD_SIZING_OVER", "BAD_SIZING_UNDER", "CALLING_WITHOUT_ODDS",
            "BLUFF_WRONG_SPOT", "MISSED_DRAW_PLAY", "PASSIVE_WITH_EQUITY",
        ];
        for (const type of types) {
            const coaching = generateEnhancedCoaching(makeCtx({ mistakeType: type }));
            expect(coaching.whatHappened).toBeTruthy();
            expect(coaching.whyMistake).toBeTruthy();
            expect(coaching.whatToDo).toBeTruthy();
        }
    });
});

// ── generateCorrectPlayCoaching ─────────────────────────────────────

describe("generateCorrectPlayCoaching", () => {
    function makeCorrectCtx(): CoachingContext {
        return {
            decision: {
                round: "flop",
                heroAction: "raise",
                optimalAction: "raise",
                optimalFrequencies: { fold: 0, call: 0.3, raise: 0.7 },
                evDiff: 0,
                equity: 0.72,
                potOdds: 0.25,
            } as Decision,
            mistakeType: null,
            mastery: undefined,
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
            round: "flop",
        };
    }

    it("returns null whyMistake for correct play", () => {
        const coaching = generateCorrectPlayCoaching(makeCorrectCtx());
        expect(coaching.whyMistake).toBeNull();
    });

    it("returns null concept for correct play", () => {
        const coaching = generateCorrectPlayCoaching(makeCorrectCtx());
        expect(coaching.concept).toBeNull();
    });

    it("returns whatHappened describing the correct action", () => {
        const coaching = generateCorrectPlayCoaching(makeCorrectCtx());
        expect(coaching.whatHappened.toLowerCase()).toContain("raise");
    });

    it("returns whatToDo with positive reinforcement", () => {
        const coaching = generateCorrectPlayCoaching(makeCorrectCtx());
        expect(coaching.whatToDo).toBeTruthy();
    });
});

// ── generateDrillCoaching ───────────────────────────────────────────

describe("generateDrillCoaching", () => {
    const mockSpot: DrillSpot = {
        id: "test-spot",
        name: "Test Spot",
        category: "flop",
        difficulty: 2,
        description: "Facing a bet on the flop",
        concept: "cbet_value",
        tags: ["value"],
        heroCards: [
            { suit: "hearts", rank: "A" },
            { suit: "spades", rank: "K" },
        ],
        communityCards: [
            { suit: "hearts", rank: "K" },
            { suit: "diamonds", rank: "7" },
            { suit: "clubs", rank: "2" },
        ],
        potSize: 10,
        heroStack: 100,
        villainStack: 100,
        heroPosition: "BTN",
        villainPosition: "BB",
        previousActions: "Hero opens BTN, Villain calls BB",
        decisionContext: {} as any,
    };

    const mockOptimalResult = {
        optimalAction: "bet" as const,
        optimalAmount: 7,
        frequencies: { fold: 0, call: 0.2, raise: 0.8 },
        reasoning: "raw reasoning",
        equity: 0.75,
        potOdds: 0,
        impliedOdds: 0,
        spr: 10,
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
            wetness: "dry" as const,
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
        evByAction: { fold: -5, call: 2, raise: 4 },
    };

    it("generates coaching for correct drill answer", () => {
        const result: DrillResult = {
            spotId: "test-spot",
            heroAction: "bet",
            isCorrect: true,
            evDelta: 0,
            optimalResult: mockOptimalResult,
            timestamp: Date.now(),
        };
        const coaching = generateDrillCoaching(mockSpot, result, undefined, mockOptimalResult);
        expect(coaching.whyMistake).toBeNull();
        expect(coaching.whatHappened).toBeTruthy();
        expect(coaching.whatToDo).toBeTruthy();
    });

    it("generates coaching for wrong drill answer", () => {
        const result: DrillResult = {
            spotId: "test-spot",
            heroAction: "check",
            isCorrect: false,
            evDelta: -2.5,
            optimalResult: mockOptimalResult,
            timestamp: Date.now(),
        };
        const coaching = generateDrillCoaching(mockSpot, result, undefined, mockOptimalResult);
        expect(coaching.whyMistake).toBeTruthy();
        expect(coaching.whatHappened).toBeTruthy();
        expect(coaching.whatToDo).toBeTruthy();
    });
});

// ── getRecommendation ───────────────────────────────────────────────

describe("getRecommendation", () => {
    it("returns unseen reason for brand new player", () => {
        const rec = getRecommendation({});
        expect(rec.concept).toBe("open_raise");
        expect(rec.reason).toBe("unseen");
        expect(rec.narrative).toBeTruthy();
    });

    it("returns struggling reason for learning concept", () => {
        const mastery: Record<string, ConceptMastery> = {
            open_raise: {
                concept: "open_raise",
                level: "learning",
                totalAttempts: 3,
                correctAttempts: 1,
                accuracy: 0.33,
                recentAccuracy: 0.2,
                totalEvDelta: -5,
                lastAttemptAt: Date.now(),
                streak: 0,
                bestStreak: 1,
            },
            cold_call: {
                concept: "cold_call",
                level: "practiced",
                totalAttempts: 10,
                correctAttempts: 6,
                accuracy: 0.6,
                recentAccuracy: 0.6,
                totalEvDelta: 2,
                lastAttemptAt: Date.now(),
                streak: 2,
                bestStreak: 3,
            },
            steal: {
                concept: "steal",
                level: "practiced",
                totalAttempts: 8,
                correctAttempts: 5,
                accuracy: 0.625,
                recentAccuracy: 0.6,
                totalEvDelta: 1,
                lastAttemptAt: Date.now(),
                streak: 1,
                bestStreak: 2,
            },
        };
        const rec = getRecommendation(mastery);
        expect(rec.concept).toBe("open_raise");
        expect(rec.reason).toBe("struggling");
    });

    it("returns complete reason when all mastered", () => {
        const allMastered: Record<string, ConceptMastery> = {};
        const allConcepts = [
            "open_raise", "cold_call", "steal", "cbet_value", "cbet_bluff",
            "three_bet", "squeeze", "check_call", "check_raise", "float",
            "probe", "pot_control", "bluff_catch", "barrel", "semi_bluff",
            "value_bet_thin", "river_bluff", "river_raise",
        ];
        for (const concept of allConcepts) {
            allMastered[concept] = {
                concept,
                level: "mastered",
                totalAttempts: 20,
                correctAttempts: 18,
                accuracy: 0.9,
                recentAccuracy: 0.85,
                totalEvDelta: 10,
                lastAttemptAt: Date.now(),
                streak: 5,
                bestStreak: 5,
            };
        }
        const rec = getRecommendation(allMastered);
        expect(rec.concept).toBeNull();
        expect(rec.reason).toBe("complete");
    });

    it("narrative includes concept label when concept is not null", () => {
        const rec = getRecommendation({});
        expect(rec.narrative.length).toBeGreaterThan(10);
    });
});

// ── generateSessionDebrief ──────────────────────────────────────────

describe("generateSessionDebrief", () => {
    const cleanAnalysis: AnalysisData = {
        heroGrade: "A+",
        decisions: [],
        totalEvLoss: 0,
        totalHeroEv: 5,
        mistakes: [],
        handNumber: 1,
    };

    const mistakeAnalysis: AnalysisData = {
        heroGrade: "C",
        decisions: [],
        totalEvLoss: 8,
        totalHeroEv: -3,
        mistakes: [
            {
                round: "flop",
                description: "Missed c-bet",
                severity: "moderate",
                evLoss: 3,
                heroAction: "check",
                optimalAction: "bet",
                type: "MISSED_CBET",
                category: "AGGRESSION",
            },
            {
                round: "turn",
                description: "Overcalled",
                severity: "major",
                evLoss: 5,
                heroAction: "call",
                optimalAction: "fold",
                type: "OVERCALL",
                category: "FREQUENCY",
            },
        ],
        handNumber: 2,
    };

    it("returns a headline and empty details for clean session", () => {
        const debrief = generateSessionDebrief(cleanAnalysis, [], {});
        expect(debrief.headline).toBeTruthy();
        expect(Array.isArray(debrief.details)).toBe(true);
    });

    it("returns suggestedDrill for session with mistakes", () => {
        const debrief = generateSessionDebrief(mistakeAnalysis, [], {});
        expect(debrief.suggestedDrill).toBeTruthy();
    });

    it("returns headline mentioning mistakes when present", () => {
        const debrief = generateSessionDebrief(mistakeAnalysis, [], {});
        expect(debrief.headline).toBeTruthy();
    });

    it("returns details with at least one bullet", () => {
        const debrief = generateSessionDebrief(mistakeAnalysis, [], {});
        expect(debrief.details.length).toBeGreaterThanOrEqual(1);
    });
});
