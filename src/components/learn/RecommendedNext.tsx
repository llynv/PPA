import { Link } from "react-router-dom";
import { CONCEPT_LABELS } from "../../lib/concept-labels";
import type { Recommendation } from "../../types/poker";

interface RecommendedNextProps {
    recommendation: Recommendation;
}

export function RecommendedNext({ recommendation }: RecommendedNextProps) {
    const { concept, narrative } = recommendation;

    if (concept === null) {
        return (
            <div className="bg-slate-800 rounded-xl p-4 md:p-6 shadow-lg text-center">
                <p className="text-lg font-semibold text-emerald-400">
                    All concepts mastered!
                </p>
                <p className="text-sm text-slate-400 mt-1">{narrative}</p>
            </div>
        );
    }

    const label = CONCEPT_LABELS[concept] ?? concept;

    return (
        <div className="bg-slate-800 rounded-xl p-4 md:p-6 shadow-lg flex items-center justify-between gap-4">
            <div className="min-w-0">
                <p className="text-sm text-slate-400">Your next focus</p>
                <p className="text-lg font-semibold text-neutral-100 truncate">
                    {label}
                </p>
                <p className="text-sm text-slate-400 mt-1">{narrative}</p>
            </div>
            <Link
                to={`/practice/drills?concept=${concept}`}
                className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
                Start Drilling
            </Link>
        </div>
    );
}
