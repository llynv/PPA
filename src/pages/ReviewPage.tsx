import { Link } from "react-router-dom";
import { AnalysisDashboard } from "../components/analysis/AnalysisDashboard";
import { useGameStore } from "../store/gameStore";

export function ReviewPage() {
    const gamePhase = useGameStore((s) => s.gamePhase);
    const handNumber = useGameStore((s) => s.handNumber);
    const viewAnalysis = useGameStore((s) => s.viewAnalysis);

    if (gamePhase === "analysis") {
        return <AnalysisDashboard />;
    }

    if (gamePhase === "showdown") {
        return (
            <div className="max-w-3xl mx-auto px-4 py-10 md:px-6">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
                    <p className="text-sm font-medium text-emerald-400 mb-3">
                        Showdown complete
                    </p>
                    <h1 className="text-2xl font-bold text-white mb-3">
                        Your showdown is ready for review
                    </h1>
                    <p className="text-neutral-300 mb-6 leading-7">
                        Hand #{handNumber} is complete. Open the hand review to
                        generate analysis and continue studying from the Review surface.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={viewAnalysis}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
                        >
                            Open hand review
                        </button>
                        <Link
                            to="/practice"
                            className="inline-flex bg-neutral-800 hover:bg-neutral-700 text-neutral-100 px-4 py-2 rounded-lg font-medium transition-colors border border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-400"
                        >
                            Return to practice
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-10 md:px-6">
            <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-900 p-6 md:p-8">
                <p className="text-sm font-medium text-emerald-400 mb-3">
                    Review space
                </p>
                <h1 className="text-2xl font-bold text-white mb-3">
                    Review your hands
                </h1>
                <p className="text-neutral-300 mb-6 leading-7">
                    Finish a hand in Practice to unlock review. Once analysis is generated,
                    this page becomes the study surface for mistakes, EV, and hand replay.
                </p>
                <Link
                    to="/practice"
                    className="inline-flex bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                    Go to practice
                </Link>
            </div>
        </div>
    );
}
