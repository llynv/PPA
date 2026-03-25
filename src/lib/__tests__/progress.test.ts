import { describe, it, expect } from "vitest";
import { computeMasteryLevel, computeRecentAccuracy, createEmptyMastery } from "../progress";
import type { ConceptMastery, AttemptRecord } from "../../types/progress";

function makeMastery(overrides: Partial<ConceptMastery>): ConceptMastery {
    return { ...createEmptyMastery("test_concept"), ...overrides };
}

function makeAttempt(overrides: Partial<AttemptRecord>): AttemptRecord {
    return {
        id: "a1",
        source: "drill",
        concept: "test_concept",
        isCorrect: true,
        evDelta: 0,
        timestamp: Date.now(),
        ...overrides,
    };
}

// ── computeMasteryLevel ────────────────────────────────────────────

describe("computeMasteryLevel", () => {
    it("returns 'unseen' when totalAttempts === 0", () => {
        const mastery = makeMastery({ totalAttempts: 0 });
        expect(computeMasteryLevel(mastery)).toBe("unseen");
    });

    it("returns 'learning' when totalAttempts < 5", () => {
        const mastery = makeMastery({ totalAttempts: 3, accuracy: 0.67 });
        expect(computeMasteryLevel(mastery)).toBe("learning");
    });

    it("returns 'learning' when totalAttempts >= 5 but accuracy < 0.4", () => {
        const mastery = makeMastery({ totalAttempts: 8, accuracy: 0.3, recentAccuracy: 0.3 });
        expect(computeMasteryLevel(mastery)).toBe("learning");
    });

    it("returns 'practiced' when accuracy >= 0.4 but recentAccuracy < 0.6", () => {
        const mastery = makeMastery({
            totalAttempts: 10,
            accuracy: 0.5,
            recentAccuracy: 0.5,
        });
        expect(computeMasteryLevel(mastery)).toBe("practiced");
    });

    it("returns 'solid' when recentAccuracy >= 0.6, totalAttempts >= 10, but recentAccuracy < 0.8", () => {
        const mastery = makeMastery({
            totalAttempts: 12,
            accuracy: 0.6,
            recentAccuracy: 0.7,
            streak: 5,
        });
        expect(computeMasteryLevel(mastery)).toBe("solid");
    });

    it("returns 'solid' when recentAccuracy >= 0.8 but totalAttempts < 15", () => {
        const mastery = makeMastery({
            totalAttempts: 12,
            accuracy: 0.8,
            recentAccuracy: 0.85,
            streak: 5,
        });
        expect(computeMasteryLevel(mastery)).toBe("solid");
    });

    it("returns 'solid' when recentAccuracy >= 0.8, totalAttempts >= 15 but streak < 3", () => {
        const mastery = makeMastery({
            totalAttempts: 20,
            accuracy: 0.8,
            recentAccuracy: 0.9,
            streak: 2,
        });
        expect(computeMasteryLevel(mastery)).toBe("solid");
    });

    it("returns 'mastered' when recentAccuracy >= 0.8, totalAttempts >= 15, streak >= 3", () => {
        const mastery = makeMastery({
            totalAttempts: 20,
            accuracy: 0.85,
            recentAccuracy: 0.9,
            streak: 5,
        });
        expect(computeMasteryLevel(mastery)).toBe("mastered");
    });
});

// ── computeRecentAccuracy ──────────────────────────────────────────

describe("computeRecentAccuracy", () => {
    it("returns 0 for empty attempts", () => {
        expect(computeRecentAccuracy([], "test_concept")).toBe(0);
    });

    it("returns 0.6 for 5 attempts with 3 correct", () => {
        const attempts: AttemptRecord[] = [
            makeAttempt({ id: "1", isCorrect: true }),
            makeAttempt({ id: "2", isCorrect: true }),
            makeAttempt({ id: "3", isCorrect: true }),
            makeAttempt({ id: "4", isCorrect: false }),
            makeAttempt({ id: "5", isCorrect: false }),
        ];
        expect(computeRecentAccuracy(attempts, "test_concept")).toBe(0.6);
    });

    it("only considers the last 10 attempts when more than 10 exist", () => {
        // 5 incorrect followed by 10 correct = last 10 are all correct
        const attempts: AttemptRecord[] = [
            ...Array.from({ length: 5 }, (_, i) =>
                makeAttempt({ id: `old-${i}`, isCorrect: false })
            ),
            ...Array.from({ length: 10 }, (_, i) =>
                makeAttempt({ id: `new-${i}`, isCorrect: true })
            ),
        ];
        expect(computeRecentAccuracy(attempts, "test_concept")).toBe(1.0);
    });
});

// ── createEmptyMastery ─────────────────────────────────────────────

describe("createEmptyMastery", () => {
    it("returns all zeros with 'unseen' level", () => {
        const mastery = createEmptyMastery("pot_odds");
        expect(mastery).toEqual({
            concept: "pot_odds",
            level: "unseen",
            totalAttempts: 0,
            correctAttempts: 0,
            accuracy: 0,
            recentAccuracy: 0,
            totalEvDelta: 0,
            lastAttemptAt: 0,
            streak: 0,
            bestStreak: 0,
        });
    });
});
