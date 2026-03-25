import type { HeroGrade } from "./poker";

export type MasteryLevel = "unseen" | "learning" | "practiced" | "solid" | "mastered";

export interface AttemptRecord {
    id: string;
    source: "live" | "drill";
    concept: string;
    isCorrect: boolean;
    evDelta: number;
    grade?: HeroGrade;
    timestamp: number;
}

export interface ConceptMastery {
    concept: string;
    level: MasteryLevel;
    totalAttempts: number;
    correctAttempts: number;
    accuracy: number;
    recentAccuracy: number;
    totalEvDelta: number;
    lastAttemptAt: number;
    streak: number;
    bestStreak: number;
}

export interface SessionSummary {
    id: string;
    type: "live" | "drill";
    handsPlayed: number;
    averageGrade?: HeroGrade;
    accuracy?: number;
    totalEvDelta: number;
    weakestConcept: string | null;
    timestamp: number;
}

export interface OverallStats {
    totalHands: number;
    totalDrills: number;
    overallAccuracy: number;
    currentStreak: number;
    bestStreak: number;
    averageGrade: HeroGrade;
}
