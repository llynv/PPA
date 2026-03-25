import type { ConceptMastery, MasteryLevel } from "../types/progress";
import type { CurriculumTier } from "../types/curriculum";
import type { DrillConcept } from "../types/drill";
import { CURRICULUM } from "../data/curriculum";

export const PRACTICED_OR_ABOVE: Set<MasteryLevel> = new Set(["practiced", "solid", "mastered"]);

export function isTierUnlocked(
    tier: CurriculumTier,
    mastery: Record<string, ConceptMastery>
): boolean {
    if (tier.unlockRequirement === null) return true;

    const prereqTier = CURRICULUM.find((t) => t.id === tier.unlockRequirement!.tier);
    if (!prereqTier) return false;

    const practicedCount = prereqTier.concepts.filter(
        (concept) => mastery[concept] && PRACTICED_OR_ABOVE.has(mastery[concept].level)
    ).length;

    return practicedCount >= tier.unlockRequirement.minConceptsPracticed;
}

export function recommendNextConcept(
    mastery: Record<string, ConceptMastery>
): DrillConcept | null {
    // 1. Walk tiers in order — find first unseen concept in an unlocked tier
    for (const tier of CURRICULUM) {
        if (!isTierUnlocked(tier, mastery)) continue;
        for (const concept of tier.concepts) {
            if (!mastery[concept]) return concept;
        }
    }

    // 2. Find "learning" concepts (accuracy < 0.4 or totalAttempts < 5), return weakest
    const learningConcepts: { concept: DrillConcept; recentAccuracy: number }[] = [];
    for (const tier of CURRICULUM) {
        for (const concept of tier.concepts) {
            const m = mastery[concept];
            if (m && m.level === "learning") {
                learningConcepts.push({ concept, recentAccuracy: m.recentAccuracy });
            }
        }
    }
    if (learningConcepts.length > 0) {
        learningConcepts.sort((a, b) => a.recentAccuracy - b.recentAccuracy);
        return learningConcepts[0].concept;
    }

    // 3. Find "practiced" concepts, return weakest by recentAccuracy
    const practicedConcepts: { concept: DrillConcept; recentAccuracy: number }[] = [];
    for (const tier of CURRICULUM) {
        for (const concept of tier.concepts) {
            const m = mastery[concept];
            if (m && m.level === "practiced") {
                practicedConcepts.push({ concept, recentAccuracy: m.recentAccuracy });
            }
        }
    }
    if (practicedConcepts.length > 0) {
        practicedConcepts.sort((a, b) => a.recentAccuracy - b.recentAccuracy);
        return practicedConcepts[0].concept;
    }

    // 4. Find "solid" concepts, return stalest by lastAttemptAt
    const solidConcepts: { concept: DrillConcept; lastAttemptAt: number }[] = [];
    for (const tier of CURRICULUM) {
        for (const concept of tier.concepts) {
            const m = mastery[concept];
            if (m && m.level === "solid") {
                solidConcepts.push({ concept, lastAttemptAt: m.lastAttemptAt });
            }
        }
    }
    if (solidConcepts.length > 0) {
        solidConcepts.sort((a, b) => a.lastAttemptAt - b.lastAttemptAt);
        return solidConcepts[0].concept;
    }

    // 5. Walk tiers — find first unseen concept in locked tiers (encourage advancement)
    for (const tier of CURRICULUM) {
        if (isTierUnlocked(tier, mastery)) continue;
        for (const concept of tier.concepts) {
            if (!mastery[concept]) return concept;
        }
    }

    // 6. All mastered
    return null;
}

// Re-export for consumers that want the full recommendation with narrative
export { getRecommendation } from "./coaching";
