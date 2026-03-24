import { useGameStore } from "../../store/gameStore";

const GRADE_COLORS: Record<string, string> = {
    "A+": "text-emerald-400", A: "text-emerald-400", "A-": "text-emerald-400",
    "B+": "text-sky-400", B: "text-sky-400", "B-": "text-sky-400",
    "C+": "text-amber-400", C: "text-amber-400", "C-": "text-amber-400",
    D: "text-orange-400", F: "text-red-400",
};

export function HandHistoryChips() {
    const sessionAnalyses = useGameStore((s) => s.sessionAnalyses);
    const selectedIndex = useGameStore((s) => s.selectedAnalysisIndex);
    const selectAnalysis = useGameStore((s) => s.selectAnalysis);

    if (sessionAnalyses.length <= 1) return null;

    return (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {sessionAnalyses.map((analysis, i) => {
                const isActive = selectedIndex === i || (selectedIndex === -1 && i === sessionAnalyses.length - 1);
                const gradeColor = GRADE_COLORS[analysis.heroGrade] ?? "text-slate-400";

                return (
                    <button
                        key={analysis.handNumber}
                        onClick={() => selectAnalysis(i)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
              ${isActive
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700"
                            }`}
                    >
                        <span>Hand {analysis.handNumber}</span>
                        <span className={`ml-1.5 ${isActive ? "text-white" : gradeColor}`}>
                            {analysis.heroGrade}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
