import type { CurriculumTier } from "../../types/curriculum";
import type { ConceptMastery } from "../../types/progress";
import { PRACTICED_OR_ABOVE } from "../../lib/learning-path";
import { ConceptChip } from "./ConceptChip";

interface CurriculumTierCardProps {
    tier: CurriculumTier;
    mastery: Record<string, ConceptMastery>;
    isUnlocked: boolean;
}

export function CurriculumTierCard({ tier, mastery, isUnlocked }: CurriculumTierCardProps) {
    const practicedCount = tier.concepts.filter(
        (c) => mastery[c] && PRACTICED_OR_ABOVE.has(mastery[c].level)
    ).length;
    const totalCount = tier.concepts.length;
    const progressPercent = totalCount > 0 ? Math.round((practicedCount / totalCount) * 100) : 0;

    return (
        <div
            className={`bg-slate-800 rounded-xl p-4 md:p-6 shadow-lg ${!isUnlocked ? "opacity-60" : ""}`}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold text-neutral-100">
                    {tier.name}
                </h3>
                {!isUnlocked && (
                    <svg
                        className="w-4 h-4 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-label="Locked"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                        />
                    </svg>
                )}
            </div>

            {/* Description */}
            <p className="text-sm text-slate-400 mb-3">{tier.description}</p>

            {/* Progress bar */}
            <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Progress</span>
                    <span>
                        {practicedCount}/{totalCount} practiced+
                    </span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Concept chips grid */}
            <div className="flex flex-wrap gap-2">
                {tier.concepts.map((concept) => (
                    <ConceptChip
                        key={concept}
                        concept={concept}
                        mastery={mastery[concept]}
                    />
                ))}
            </div>
        </div>
    );
}
