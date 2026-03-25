import { useNavigate } from "react-router-dom";
import { useProgressStore } from "../../store/progressStore";
import { CONCEPT_LABELS } from "../../lib/concept-labels";
import { MISTAKE_TYPE_LABELS } from "../../lib/mistake-mappings";
import type { MasteryLevel } from "../../types/progress";

const DRILL_CONCEPT_CATEGORY: Record<string, string> = {
    open_raise: "FREQUENCY",
    three_bet: "FREQUENCY",
    cold_call: "FREQUENCY",
    squeeze: "FREQUENCY",
    steal: "FREQUENCY",
    cbet_value: "AGGRESSION",
    cbet_bluff: "AGGRESSION",
    check_raise: "AGGRESSION",
    float: "EQUITY_REALIZATION",
    probe: "AGGRESSION",
    barrel: "AGGRESSION",
    pot_control: "EQUITY_REALIZATION",
    semi_bluff: "EQUITY_REALIZATION",
    check_call: "FREQUENCY",
    value_bet_thin: "AGGRESSION",
    bluff_catch: "EQUITY_REALIZATION",
    river_raise: "AGGRESSION",
    river_bluff: "AGGRESSION",
};

const MASTERY_COLORS: Record<MasteryLevel, string> = {
    unseen: "bg-slate-700 text-slate-500",
    learning: "bg-red-900/30 text-red-400 border border-red-500/30",
    practiced: "bg-amber-900/30 text-amber-400 border border-amber-500/30",
    solid: "bg-blue-900/30 text-blue-400 border border-blue-500/30",
    mastered: "bg-emerald-900/30 text-emerald-400 border border-emerald-500/30",
};

const CATEGORY_LABELS: Record<string, string> = {
    FREQUENCY: "Frequency",
    AGGRESSION: "Aggression",
    EQUITY_REALIZATION: "Equity Realization",
};

function getConceptLabel(concept: string): string {
    return (
        CONCEPT_LABELS[concept] ??
        (MISTAKE_TYPE_LABELS as Record<string, string>)[concept] ??
        concept
    );
}

export function MasteryGrid() {
    const conceptMastery = useProgressStore((s) => s.conceptMastery);
    const navigate = useNavigate();

    // Filter out unseen concepts
    const attemptedConcepts = Object.values(conceptMastery).filter(
        (m) => m.level !== "unseen"
    );

    if (attemptedConcepts.length === 0) {
        return (
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg text-center">
                <p className="text-slate-400 text-sm">
                    No concepts tracked yet. Play hands or drills to start building mastery.
                </p>
            </div>
        );
    }

    // Group by category
    const grouped = new Map<string, typeof attemptedConcepts>();
    for (const mastery of attemptedConcepts) {
        const category = DRILL_CONCEPT_CATEGORY[mastery.concept] ?? "OTHER";
        const list = grouped.get(category) ?? [];
        list.push(mastery);
        grouped.set(category, list);
    }

    // Sort categories in a stable order
    const categoryOrder = ["FREQUENCY", "AGGRESSION", "EQUITY_REALIZATION", "OTHER"];
    const sortedCategories = categoryOrder.filter((c) => grouped.has(c));

    return (
        <div className="space-y-6">
            {sortedCategories.map((category) => {
                const concepts = grouped.get(category)!;
                return (
                    <div key={category}>
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                            {CATEGORY_LABELS[category] ?? category}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {concepts.map((mastery) => {
                                const accuracyPercent = Math.round(mastery.accuracy * 100);
                                return (
                                    <button
                                        key={mastery.concept}
                                        onClick={() =>
                                            navigate(`/practice/drills?concept=${mastery.concept}`)
                                        }
                                        className="bg-slate-800 rounded-xl p-3 shadow-lg text-left hover:bg-slate-700 transition-colors cursor-pointer"
                                    >
                                        <p className="text-sm font-medium text-neutral-100 truncate">
                                            {getConceptLabel(mastery.concept)}
                                        </p>
                                        <span
                                            className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${MASTERY_COLORS[mastery.level]}`}
                                        >
                                            {mastery.level}
                                        </span>
                                        <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                                            <span>{accuracyPercent}% accuracy</span>
                                            <span>{mastery.totalAttempts} attempts</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
