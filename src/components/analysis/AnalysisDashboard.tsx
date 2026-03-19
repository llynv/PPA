import { useGameStore } from "../../store/gameStore";
import { HeroGrade } from "./HeroGrade";
import { HandTimeline } from "./HandTimeline";
import { DecisionChart } from "./DecisionChart";
import { MistakeCard } from "./MistakeCard";
import { EVTracker } from "./EVTracker";
import type { Mistake } from "../../types/poker";

const SEVERITY_ORDER: Record<Mistake["severity"], number> = {
    major: 0,
    moderate: 1,
    minor: 2,
};

export function AnalysisDashboard() {
    const analysisData = useGameStore((s) => s.analysisData);
    const sessionAnalyses = useGameStore((s) => s.sessionAnalyses);
    const startHand = useGameStore((s) => s.startHand);
    const processAITurns = useGameStore((s) => s.processAITurns);
    const resetGame = useGameStore((s) => s.resetGame);

    if (!analysisData) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <p className="text-slate-400 text-lg">
                    No analysis data available.
                </p>
            </div>
        );
    }

    const sortedMistakes = [...analysisData.mistakes].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    );

    // Map decisions by round for correlating mistakes to decisions
    const decisionByRound = new Map(
        analysisData.decisions.map((d) => [d.round, d]),
    );

    const handleNextHand = () => {
        startHand();
        processAITurns();
    };

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
            {/* Title */}
            <h2 className="text-2xl font-bold text-slate-100 text-center">
                Hand Analysis — Hand #{analysisData.handNumber}
            </h2>

            {/* 1. Hero Grade */}
            <div className="flex justify-center">
                <HeroGrade
                    grade={analysisData.heroGrade}
                    evLoss={analysisData.totalEvLoss}
                    decisions={analysisData.decisions}
                />
            </div>

            {/* 2. Hand Timeline */}
            <HandTimeline decisions={analysisData.decisions} />

            {/* 3. Decision Chart */}
            <DecisionChart decisions={analysisData.decisions} />

            {/* 4. Mistakes */}
            <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-3">
                    Mistakes ({analysisData.mistakes.length})
                </h3>
                {sortedMistakes.length > 0 ? (
                    <div className="space-y-3">
                        {sortedMistakes.map((mistake, i) => (
                            <MistakeCard
                                key={i}
                                mistake={mistake}
                                index={i}
                                decision={decisionByRound.get(mistake.round)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-800 rounded-xl p-6 shadow-lg text-center">
                        <p className="text-emerald-400 font-medium">
                            Perfect play — no mistakes!
                        </p>
                    </div>
                )}
            </div>

            {/* 5. EV Tracker */}
            {sessionAnalyses.length > 0 && (
                <EVTracker analyses={sessionAnalyses} />
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                    onClick={handleNextHand}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold text-lg transition-colors"
                >
                    Next Hand
                </button>
                <button
                    onClick={resetGame}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 rounded-lg font-bold text-lg transition-colors"
                >
                    Back to Settings
                </button>
            </div>
        </div>
    );
}
