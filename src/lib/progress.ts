import type { MasteryLevel, ConceptMastery, AttemptRecord } from "../types/progress";

const RECENT_WINDOW = 10;
const LEARNING_MIN_ATTEMPTS = 5;
const LEARNING_MIN_ACCURACY = 0.4;
const SOLID_MIN_RECENT_ACCURACY = 0.6;
const MASTERED_MIN_ATTEMPTS = 15;
const MASTERED_MIN_RECENT_ACCURACY = 0.8;
const MASTERED_MIN_STREAK = 3;

export function computeMasteryLevel(mastery: ConceptMastery): MasteryLevel {
    if (mastery.totalAttempts === 0) return "unseen";
    if (mastery.totalAttempts < LEARNING_MIN_ATTEMPTS || mastery.accuracy < LEARNING_MIN_ACCURACY)
        return "learning";
    if (mastery.recentAccuracy < SOLID_MIN_RECENT_ACCURACY) return "practiced";
    if (
        mastery.recentAccuracy >= MASTERED_MIN_RECENT_ACCURACY &&
        mastery.totalAttempts >= MASTERED_MIN_ATTEMPTS &&
        mastery.streak >= MASTERED_MIN_STREAK
    )
        return "mastered";
    return "solid";
}

export function computeRecentAccuracy(attempts: AttemptRecord[], concept: string): number {
    const conceptAttempts = attempts.filter((a) => a.concept === concept).slice(-RECENT_WINDOW);
    if (conceptAttempts.length === 0) return 0;
    return conceptAttempts.filter((a) => a.isCorrect).length / conceptAttempts.length;
}

export function createEmptyMastery(concept: string): ConceptMastery {
    return {
        concept,
        level: "unseen",
        totalAttempts: 0,
        correctAttempts: 0,
        accuracy: 0,
        recentAccuracy: 0,
        totalEvDelta: 0,
        lastAttemptAt: 0,
        streak: 0,
        bestStreak: 0,
    };
}
