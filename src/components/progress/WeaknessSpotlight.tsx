import { useNavigate } from "react-router-dom";
import { useProgressStore } from "../../store/progressStore";
import { CONCEPT_LABELS } from "../../lib/concept-labels";
import { MISTAKE_TYPE_LABELS } from "../../lib/mistake-mappings";

function getConceptLabel(concept: string): string {
    return (
        CONCEPT_LABELS[concept] ??
        (MISTAKE_TYPE_LABELS as Record<string, string>)[concept] ??
        concept
    );
}

function getAccuracyBarColor(accuracy: number): string {
    if (accuracy >= 0.8) return "bg-emerald-500";
    if (accuracy >= 0.6) return "bg-blue-500";
    if (accuracy >= 0.4) return "bg-amber-500";
    return "bg-red-500";
}

function getAccuracyTextColor(accuracy: number): string {
    if (accuracy >= 0.8) return "text-emerald-400";
    if (accuracy >= 0.6) return "text-blue-400";
    if (accuracy >= 0.4) return "text-amber-400";
    return "text-red-400";
}

export function WeaknessSpotlight() {
    const getWeakestConcepts = useProgressStore((s) => s.getWeakestConcepts);
    const navigate = useNavigate();

    const weakest = getWeakestConcepts(3);

    // If fewer than 1 concept has been attempted, return null
    if (weakest.length < 1) {
        return null;
    }

    return (
        <div className="bg-slate-800 rounded-xl p-4 md:p-6 shadow-lg">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <svg
                    className="w-4 h-4 text-amber-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                </svg>
                <h3 className="text-sm font-semibold text-neutral-100">Your Top Leaks</h3>
            </div>

            {/* Weakness rows */}
            <div className="space-y-3">
                {weakest.map((mastery) => {
                    const accuracyPercent = Math.round(mastery.recentAccuracy * 100);

                    return (
                        <div
                            key={mastery.concept}
                            className="flex items-center gap-3"
                        >
                            {/* Concept info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-neutral-100 truncate">
                                    {getConceptLabel(mastery.concept)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    {/* Accuracy bar */}
                                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${getAccuracyBarColor(mastery.recentAccuracy)}`}
                                            style={{ width: `${accuracyPercent}%` }}
                                        />
                                    </div>
                                    <span
                                        className={`text-xs font-medium shrink-0 ${getAccuracyTextColor(mastery.recentAccuracy)}`}
                                    >
                                        {accuracyPercent}%
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {mastery.totalAttempts} attempts
                                </p>
                            </div>

                            {/* Drill CTA */}
                            <button
                                onClick={() =>
                                    navigate(`/practice/drills?concept=${mastery.concept}`)
                                }
                                className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors"
                            >
                                Drill this
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
