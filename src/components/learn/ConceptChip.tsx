import { Link } from "react-router-dom";
import { CONCEPT_LABELS } from "../../lib/concept-labels";
import { CONCEPT_TEACHINGS } from "../../data/conceptTeachings";
import type { DrillConcept } from "../../types/drill";
import type { ConceptMastery, MasteryLevel } from "../../types/progress";

const MASTERY_DOT_COLORS: Record<MasteryLevel, string> = {
    unseen: "bg-neutral-600",
    learning: "bg-red-500",
    practiced: "bg-amber-500",
    solid: "bg-blue-500",
    mastered: "bg-emerald-500",
};

interface ConceptChipProps {
    concept: DrillConcept;
    mastery: ConceptMastery | undefined;
}

export function ConceptChip({ concept, mastery }: ConceptChipProps) {
    const label = CONCEPT_LABELS[concept] ?? concept;
    const level: MasteryLevel = mastery?.level ?? "unseen";
    const accuracyPercent = mastery ? Math.round(mastery.accuracy * 100) : null;
    const teaching = CONCEPT_TEACHINGS[concept];

    return (
        <Link
            to={`/practice/drills?concept=${concept}`}
            className="group relative inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-neutral-200 hover:bg-slate-600 transition-colors"
            title={teaching?.summary}
        >
            <span
                className={`h-2 w-2 shrink-0 rounded-full ${MASTERY_DOT_COLORS[level]}`}
                aria-label={`Mastery: ${level}`}
            />
            <span className="truncate">{label}</span>
            {accuracyPercent !== null && (
                <span className="text-slate-400">{accuracyPercent}%</span>
            )}
        </Link>
    );
}
