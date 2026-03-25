import type { DrillConcept } from "./drill";

export interface CurriculumTier {
    id: number;
    name: string;
    description: string;
    concepts: DrillConcept[];
    unlockRequirement: { tier: number; minConceptsPracticed: number } | null;
}
