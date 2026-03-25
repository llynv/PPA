import type { ConceptMastery, MasteryLevel } from "../types/progress";
import type { CurriculumTier } from "../types/curriculum";
import type { DrillConcept } from "../types/drill";
import { CURRICULUM } from "../data/curriculum";
import { getRecommendation } from "./coaching";

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

/** Backward-compatible wrapper — delegates to getRecommendation().concept */
export function recommendNextConcept(
    mastery: Record<string, ConceptMastery>
): DrillConcept | null {
    return getRecommendation(mastery).concept;
}

// Re-export for consumers that want the full recommendation with narrative
export { getRecommendation };
