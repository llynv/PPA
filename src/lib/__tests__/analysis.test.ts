import { describe, it, expect } from "vitest";
import { classifyMistake, generateCoaching } from "../analysis";
import type { Decision } from "../../types/poker";

// Minimal decision factory for testing
function makeDecision(overrides: Partial<Decision> = {}): Decision {
    return {
        round: "flop",
        heroAction: "fold",
        optimalAction: "call",
        optimalFrequencies: { fold: 0.1, call: 0.6, raise: 0.3 },
        evDiff: 3,
        equity: 0.45,
        potOdds: 0.25,
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
            wetness: "semi-wet",
            isMonotone: false,
            isTwoTone: true,
            isRainbow: false,
            isPaired: false,
            isTrips: false,
            highCardCount: 1,
            connectedness: 0.3,
            possibleStraights: 1,
            possibleFlushes: false,
        },
        ...overrides,
    };
}

describe("classifyMistake", () => {
    it("returns OVERFOLD when hero folded but should have called/raised with equity", () => {
        const decision = makeDecision({
            heroAction: "fold",
            optimalAction: "call",
            equity: 0.45,
            potOdds: 0.25,
        });
        const result = classifyMistake(decision);
        expect(result.type).toBe("OVERFOLD");
        expect(result.category).toBe("FREQUENCY");
    });

    it("returns OVERCALL when hero called but should have folded with draws", () => {
        const decision = makeDecision({
            heroAction: "call",
            optimalAction: "fold",
            equity: 0.15,
            potOdds: 0.3,
            draws: {
                flushDraw: false,
                flushDrawOuts: 0,
                oesD: true,
                gutshot: false,
                straightDrawOuts: 4,
                backdoorFlush: false,
                backdoorStraight: false,
                totalOuts: 4,
                drawEquity: 0.08,
            },
        });
        const result = classifyMistake(decision);
        expect(result.type).toBe("OVERCALL");
        expect(result.category).toBe("FREQUENCY");
    });

    it("returns MISSED_VALUE_BET when hero checked/called but should have raised with high equity", () => {
        const decision = makeDecision({
            heroAction: "call",
            optimalAction: "raise",
            equity: 0.7,
        });
        const result = classifyMistake(decision);
        expect(result.type).toBe("MISSED_VALUE_BET");
        expect(result.category).toBe("AGGRESSION");
    });

    it("returns PASSIVE_WITH_EQUITY when hero called with strong equity but raise was optimal", () => {
        const decision = makeDecision({
            heroAction: "call",
            optimalAction: "raise",
            equity: 0.58,
        });
        const result = classifyMistake(decision);
        expect(result.type).toBe("PASSIVE_WITH_EQUITY");
        expect(result.category).toBe("FREQUENCY");
    });

    it("returns CALLING_WITHOUT_ODDS when hero called without pot odds and no draws", () => {
        const decision = makeDecision({
            heroAction: "call",
            optimalAction: "fold",
            equity: 0.18,
            potOdds: 0.25,
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
        });
        const result = classifyMistake(decision);
        expect(result.type).toBe("CALLING_WITHOUT_ODDS");
        expect(result.category).toBe("EQUITY_REALIZATION");
    });

    it("returns MISSED_DRAW_PLAY when hero folded with a draw and raise was optimal", () => {
        const decision = makeDecision({
            heroAction: "fold",
            optimalAction: "raise",
            equity: 0.35,
            draws: {
                flushDraw: true,
                flushDrawOuts: 9,
                oesD: false,
                gutshot: false,
                straightDrawOuts: 0,
                backdoorFlush: false,
                backdoorStraight: false,
                totalOuts: 9,
                drawEquity: 0.19,
            },
        });
        const result = classifyMistake(decision);
        expect(result.type).toBe("MISSED_DRAW_PLAY");
        expect(result.category).toBe("EQUITY_REALIZATION");
    });

    it("returns BAD_SIZING_OVER when hero bet too large", () => {
        const decision = makeDecision({
            heroAction: "raise",
            optimalAction: "raise",
            betSizeAnalysis: {
                heroSize: 100,
                optimalSize: 50,
                sizingError: 1.0,
            },
        });
        const result = classifyMistake(decision);
        expect(result.type).toBe("BAD_SIZING_OVER");
        expect(result.category).toBe("SIZING");
    });

    it("returns BAD_SIZING_UNDER when hero bet too small", () => {
        const decision = makeDecision({
            heroAction: "bet",
            optimalAction: "bet",
            betSizeAnalysis: {
                heroSize: 20,
                optimalSize: 50,
                sizingError: -0.6,
            },
        });
        const result = classifyMistake(decision);
        expect(result.type).toBe("BAD_SIZING_UNDER");
        expect(result.category).toBe("SIZING");
    });

    it("returns BLUFF_WRONG_SPOT when hero raised with low equity on dry board with no draws", () => {
        const decision = makeDecision({
            heroAction: "raise",
            optimalAction: "fold",
            equity: 0.15,
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
                connectedness: 0.1,
                possibleStraights: 0,
                possibleFlushes: false,
            },
        });
        const result = classifyMistake(decision);
        expect(result.type).toBe("BLUFF_WRONG_SPOT");
        expect(result.category).toBe("AGGRESSION");
    });

    it("returns OVERFOLD (not MISSED_DRAW_PLAY) when hero folded with draws but optimal was call", () => {
        const decision = makeDecision({
            heroAction: "fold",
            optimalAction: "call",
            draws: {
                flushDraw: true,
                flushDrawOuts: 9,
                oesD: false,
                gutshot: false,
                straightDrawOuts: 0,
                backdoorFlush: false,
                backdoorStraight: false,
                totalOuts: 9,
                drawEquity: 0.19,
            },
        });
        const result = classifyMistake(decision);
        expect(result.type).toBe("OVERFOLD");
    });

    it("returns BLUFF_WRONG_SPOT when hero raised but should have called with low equity", () => {
        const decision = makeDecision({
            heroAction: "raise",
            optimalAction: "call",
            equity: 0.20,
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
        });
        const result = classifyMistake(decision);
        expect(result.type).toBe("BLUFF_WRONG_SPOT");
        expect(result.category).toBe("AGGRESSION");
    });

    it("returns MISSED_VALUE_BET when hero raised but should have called with high equity", () => {
        const decision = makeDecision({
            heroAction: "raise",
            optimalAction: "call",
            equity: 0.65,
        });
        const result = classifyMistake(decision);
        expect(result.type).toBe("MISSED_VALUE_BET");
        expect(result.category).toBe("AGGRESSION");
    });
});

describe("generateCoaching", () => {
    it("generates structured coaching for OVERFOLD", () => {
        const decision = makeDecision({
            heroAction: "fold",
            optimalAction: "call",
            equity: 0.45,
            potOdds: 0.25,
            round: "flop",
        });
        const coaching = generateCoaching(decision, "OVERFOLD");
        expect(coaching.whatHappened).toBeTruthy();
        expect(coaching.whyMistake).toBeTruthy();
        expect(coaching.whatToDo).toBeTruthy();
        expect(coaching.concept).toBe("OVERFOLD");
        expect(coaching.whatHappened).toContain("fold");
        expect(coaching.whyMistake).toContain("equity");
    });

    it("generates structured coaching for MISSED_VALUE_BET", () => {
        const decision = makeDecision({
            heroAction: "call",
            optimalAction: "raise",
            equity: 0.72,
            round: "river",
        });
        const coaching = generateCoaching(decision, "MISSED_VALUE_BET");
        expect(coaching.concept).toBe("MISSED_VALUE_BET");
        expect(coaching.whatToDo).toContain("raise");
    });

    it("generates coaching for BAD_SIZING_OVER with sizing details", () => {
        const decision = makeDecision({
            heroAction: "raise",
            optimalAction: "raise",
            betSizeAnalysis: { heroSize: 100, optimalSize: 50, sizingError: 1.0 },
        });
        const coaching = generateCoaching(decision, "BAD_SIZING_OVER");
        expect(coaching.concept).toBe("BAD_SIZING_OVER");
        expect(coaching.whyMistake).toBeTruthy();
    });
});
