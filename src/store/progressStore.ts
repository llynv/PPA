import { create } from "zustand";
import type { HeroGrade, AnalysisData, Decision } from "../types/poker";
import type { DrillResult, DrillSession, DrillSpot } from "../types/drill";
import type {
    AttemptRecord,
    ConceptMastery,
    SessionSummary,
    OverallStats,
    MasteryLevel,
} from "../types/progress";
import { computeMasteryLevel, computeRecentAccuracy, createEmptyMastery } from "../lib/progress";

// ── Grade ↔ Numeric Conversion ─────────────────────────────────────

const GRADE_VALUES: Record<HeroGrade, number> = {
    "A+": 11, "A": 10, "A-": 9,
    "B+": 8, "B": 7, "B-": 6,
    "C+": 5, "C": 4, "C-": 3,
    "D": 2, "F": 1,
};

const VALUE_TO_GRADE: HeroGrade[] = [
    "F", "F", "D", "C-", "C", "C+", "B-", "B", "B+", "A-", "A", "A+",
];

function numericToGrade(value: number): HeroGrade {
    const clamped = Math.round(Math.max(1, Math.min(11, value)));
    return VALUE_TO_GRADE[clamped];
}

// ── Concept Inference ──────────────────────────────────────────────

export function inferLiveHandConcept(decision: Decision): string {
    const { round, heroAction } = decision;

    if (heroAction === "call") return "check_call";
    if (heroAction === "fold") return "cold_call";
    if (heroAction === "check") return "pot_control";

    // bet or raise
    if (round === "preflop") return "open_raise";
    if (round === "flop") return "cbet_value";
    if (round === "turn") return "barrel";
    if (round === "river") return "value_bet_thin";

    return "pot_control";
}

// ── Store Interface ────────────────────────────────────────────────

interface ProgressStore {
    // State
    conceptMastery: Record<string, ConceptMastery>;
    sessions: SessionSummary[];
    attempts: AttemptRecord[];
    overallStats: OverallStats;

    // Record actions
    recordLiveHand: (analysis: AnalysisData) => void;
    recordDrillAttempt: (result: DrillResult, spot: DrillSpot) => void;
    recordDrillSession: (session: DrillSession) => void;

    // Query methods
    getWeakestConcepts: (n: number) => ConceptMastery[];
    getStrongestConcepts: (n: number) => ConceptMastery[];
    getRecentSessions: (n: number) => SessionSummary[];
    getMasteryDistribution: () => Record<MasteryLevel, number>;
}

// ── Store Implementation ───────────────────────────────────────────

export const useProgressStore = create<ProgressStore>((set, get) => ({
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

    recordLiveHand: (analysis) => {
        const state = get();
        const newAttempts: AttemptRecord[] = [];
        const now = Date.now();

        // Collect mistake rounds for matching
        const mistakeRounds = new Set(
            analysis.mistakes.filter((m) => m.type).map((m) => m.round)
        );

        // Create AttemptRecords for mistakes (isCorrect: false)
        for (const mistake of analysis.mistakes) {
            if (!mistake.type) continue;
            newAttempts.push({
                id: crypto.randomUUID(),
                source: "live",
                concept: mistake.type,
                isCorrect: false,
                evDelta: -mistake.evLoss,
                grade: analysis.heroGrade,
                timestamp: now,
            });
        }

        // Create AttemptRecords for clean decisions (isCorrect: true)
        for (const decision of analysis.decisions) {
            if (mistakeRounds.has(decision.round)) continue;
            newAttempts.push({
                id: crypto.randomUUID(),
                source: "live",
                concept: inferLiveHandConcept(decision),
                isCorrect: true,
                evDelta: decision.heroEv ?? 0,
                grade: analysis.heroGrade,
                timestamp: now,
            });
        }

        // Merge attempts
        const allAttempts = [...state.attempts, ...newAttempts];

        // Update concept mastery for each touched concept
        const updatedMastery = { ...state.conceptMastery };
        for (const attempt of newAttempts) {
            updatedMastery[attempt.concept] = updateConceptMastery(
                updatedMastery[attempt.concept],
                attempt,
                allAttempts
            );
        }

        // Recalculate averageGrade
        const liveAttempts = allAttempts.filter((a) => a.source === "live" && a.grade);
        const gradeSum = liveAttempts.reduce(
            (sum, a) => sum + (GRADE_VALUES[a.grade!] ?? 0),
            0
        );
        const newTotalHands = state.overallStats.totalHands + 1;
        const averageGrade =
            liveAttempts.length > 0
                ? numericToGrade(gradeSum / liveAttempts.length)
                : state.overallStats.averageGrade;

        // Find weakest concept for session summary
        const touchedConcepts = newAttempts.map((a) => a.concept);
        const weakestConcept =
            touchedConcepts.length > 0
                ? touchedConcepts.reduce((weakest, concept) => {
                      const wAcc = updatedMastery[weakest]?.recentAccuracy ?? 1;
                      const cAcc = updatedMastery[concept]?.recentAccuracy ?? 1;
                      return cAcc < wAcc ? concept : weakest;
                  })
                : null;

        // Create session summary
        const totalEvDelta = newAttempts.reduce((sum, a) => sum + a.evDelta, 0);
        const sessionSummary: SessionSummary = {
            id: crypto.randomUUID(),
            type: "live",
            handsPlayed: 1,
            averageGrade: analysis.heroGrade,
            totalEvDelta,
            weakestConcept,
            timestamp: now,
        };

        set({
            attempts: allAttempts,
            conceptMastery: updatedMastery,
            sessions: [...state.sessions, sessionSummary],
            overallStats: {
                ...state.overallStats,
                totalHands: newTotalHands,
                averageGrade,
            },
        });
    },

    recordDrillAttempt: (result, spot) => {
        const state = get();
        const now = Date.now();

        const attempt: AttemptRecord = {
            id: crypto.randomUUID(),
            source: "drill",
            concept: spot.concept,
            isCorrect: result.isCorrect,
            evDelta: result.evDelta,
            timestamp: now,
        };

        const allAttempts = [...state.attempts, attempt];
        const updatedMastery = { ...state.conceptMastery };
        updatedMastery[spot.concept] = updateConceptMastery(
            updatedMastery[spot.concept],
            attempt,
            allAttempts
        );

        // Recalculate overallAccuracy across all drill attempts
        const drillAttempts = allAttempts.filter((a) => a.source === "drill");
        const correctDrills = drillAttempts.filter((a) => a.isCorrect).length;
        const overallAccuracy =
            drillAttempts.length > 0 ? correctDrills / drillAttempts.length : 0;

        set({
            attempts: allAttempts,
            conceptMastery: updatedMastery,
            overallStats: {
                ...state.overallStats,
                totalDrills: state.overallStats.totalDrills + 1,
                overallAccuracy,
            },
        });
    },

    recordDrillSession: (session) => {
        const state = get();
        const now = Date.now();

        const results = session.results;
        const correctCount = results.filter((r) => r.isCorrect).length;
        const accuracy = results.length > 0 ? correctCount / results.length : 0;
        const totalEvDelta = results.reduce((sum, r) => sum + r.evDelta, 0);

        // Find weakest concept: group by concept, find lowest accuracy
        const conceptAccMap = new Map<string, { correct: number; total: number }>();
        for (const r of results) {
            const spot = session.allSpots.find((s) => s.id === r.spotId);
            if (!spot) continue;
            const existing = conceptAccMap.get(spot.concept) ?? { correct: 0, total: 0 };
            existing.total++;
            if (r.isCorrect) existing.correct++;
            conceptAccMap.set(spot.concept, existing);
        }

        let weakestConcept: string | null = null;
        let worstAccuracy = Infinity;
        for (const [concept, stats] of conceptAccMap) {
            const acc = stats.correct / stats.total;
            if (acc < worstAccuracy) {
                worstAccuracy = acc;
                weakestConcept = concept;
            }
        }

        const sessionSummary: SessionSummary = {
            id: crypto.randomUUID(),
            type: "drill",
            handsPlayed: results.length,
            accuracy,
            totalEvDelta,
            weakestConcept,
            timestamp: now,
        };

        set({
            sessions: [...state.sessions, sessionSummary],
        });
    },

    // ── Query Methods ──────────────────────────────────────────────

    getWeakestConcepts: (n) => {
        const mastery = get().conceptMastery;
        return Object.values(mastery)
            .filter((m) => m.totalAttempts > 0)
            .sort((a, b) => a.recentAccuracy - b.recentAccuracy)
            .slice(0, n);
    },

    getStrongestConcepts: (n) => {
        const mastery = get().conceptMastery;
        return Object.values(mastery)
            .filter((m) => m.totalAttempts > 0)
            .sort((a, b) => b.recentAccuracy - a.recentAccuracy)
            .slice(0, n);
    },

    getRecentSessions: (n) => {
        const sessions = get().sessions;
        return [...sessions].reverse().slice(0, n);
    },

    getMasteryDistribution: () => {
        const mastery = get().conceptMastery;
        const dist: Record<MasteryLevel, number> = {
            unseen: 0,
            learning: 0,
            practiced: 0,
            solid: 0,
            mastered: 0,
        };
        for (const m of Object.values(mastery)) {
            dist[m.level]++;
        }
        return dist;
    },
}));

// ── Internal Helper ────────────────────────────────────────────────

function updateConceptMastery(
    existing: ConceptMastery | undefined,
    attempt: AttemptRecord,
    allAttempts: AttemptRecord[]
): ConceptMastery {
    const mastery = existing ? { ...existing } : createEmptyMastery(attempt.concept);

    mastery.totalAttempts++;
    if (attempt.isCorrect) {
        mastery.correctAttempts++;
    }
    mastery.accuracy = mastery.correctAttempts / mastery.totalAttempts;

    if (attempt.isCorrect) {
        mastery.streak++;
    } else {
        mastery.streak = 0;
    }
    mastery.bestStreak = Math.max(mastery.bestStreak, mastery.streak);

    mastery.totalEvDelta += attempt.evDelta;
    mastery.lastAttemptAt = attempt.timestamp;

    mastery.recentAccuracy = computeRecentAccuracy(allAttempts, attempt.concept);
    mastery.level = computeMasteryLevel(mastery);

    return mastery;
}
