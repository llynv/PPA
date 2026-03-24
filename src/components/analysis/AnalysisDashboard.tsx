import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../../store/gameStore";
import { HeroGrade } from "./HeroGrade";
import { HandTimeline } from "./HandTimeline";
import { HandReplay } from "./HandReplay";
import { DecisionChart } from "./DecisionChart";
import { MistakeCard } from "./MistakeCard";
import { EVTracker } from "./EVTracker";
import type { Mistake } from "../../types/poker";

const SEVERITY_ORDER: Record<Mistake["severity"], number> = {
    major: 0,
    moderate: 1,
    minor: 2,
};

function CollapsibleSection({
    title,
    children,
    defaultOpen = false,
}: {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-slate-700 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-800/50 hover:bg-slate-700/50 transition-colors text-left focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
                <span className="text-sm font-semibold text-slate-300">
                    {title}
                </span>
                {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
            </button>
            {isOpen && <div className="p-1">{children}</div>}
        </div>
    );
}

export function AnalysisDashboard() {
    const navigate = useNavigate();
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
        void processAITurns();
        navigate("/practice");
    };

    const handleBackToSettings = () => {
        resetGame();
        navigate("/practice");
    };

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
            {/* 1. Hand Replay (replaces abstract title) */}
            <HandReplay />

            <h2 className="text-lg font-bold text-slate-100 text-center">
                Hand #{analysisData.handNumber}
            </h2>

            {/* 2. Hero Grade */}
            <div className="flex justify-center">
                <HeroGrade
                    grade={analysisData.heroGrade}
                    evLoss={analysisData.totalEvLoss}
                    heroEv={analysisData.totalHeroEv}
                    decisions={analysisData.decisions}
                />
            </div>

            {/* 3. Hand Timeline */}
            <HandTimeline decisions={analysisData.decisions} />

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

            {/* 5. Advanced Stats (collapsible) */}
            <CollapsibleSection title="Advanced Stats — Optimal Frequencies">
                <DecisionChart decisions={analysisData.decisions} />
            </CollapsibleSection>

            {/* 6. Session Stats (collapsible) */}
            {sessionAnalyses.length > 0 && (
                <CollapsibleSection title="Session Stats — EV Tracker">
                    <EVTracker analyses={sessionAnalyses} />
                </CollapsibleSection>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                    onClick={handleNextHand}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold text-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                    Next Hand
                </button>
                <button
                    onClick={handleBackToSettings}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 rounded-lg font-bold text-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                    Back to Settings
                </button>
            </div>
        </div>
    );
}
