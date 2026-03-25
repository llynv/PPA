import { Link } from "react-router-dom";
import { useProgressStore } from "../store/progressStore";

function ProgressCard() {
    const totalHands = useProgressStore((s) => s.overallStats.totalHands);
    const totalDrills = useProgressStore((s) => s.overallStats.totalDrills);
    const currentStreak = useProgressStore((s) => s.overallStats.currentStreak);
    const averageGrade = useProgressStore((s) => s.overallStats.averageGrade);

    const hasData = totalHands + totalDrills > 0;

    return (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <h2 className="text-lg font-semibold text-white mb-2">Progress</h2>
            {hasData ? (
                <>
                    <p className="text-sm text-neutral-400">
                        {totalHands} hands &middot; {totalDrills} drills
                    </p>
                    {currentStreak > 0 && (
                        <p className="text-xs text-emerald-400 mt-1">
                            {currentStreak} streak
                        </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                        Avg grade: {averageGrade}
                    </p>
                </>
            ) : (
                <p className="text-sm text-neutral-400">
                    Play hands or drills to start tracking your progress.
                </p>
            )}
        </div>
    );
}

export function HomePage() {
    return (
        <div className="max-w-5xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-8">
            <section className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 md:p-8">
                <p className="text-sm font-medium text-emerald-400 mb-3">
                    GTO Training
                </p>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    Learning-first poker coach
                </h1>
                <p className="text-neutral-300 max-w-2xl leading-7">
                    Practice hands, review decisions, drill your weak spots, and track your mastery over time.
                </p>

                <div className="flex flex-wrap gap-3 mt-6">
                    <Link
                        to="/practice"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                        Start practice
                    </Link>
                    <Link
                        to="/review"
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-100 px-4 py-2 rounded-lg font-medium transition-colors border border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                        Open review
                    </Link>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                    <h2 className="text-lg font-semibold text-white mb-2">Practice</h2>
                    <p className="text-sm text-neutral-400">
                        Configure a table and play through the current settings → hand → showdown loop.
                    </p>
                </div>
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                    <h2 className="text-lg font-semibold text-white mb-2">Review</h2>
                    <p className="text-sm text-neutral-400">
                        Inspect analysis after a hand and keep feedback separate from live play.
                    </p>
                </div>
                <ProgressCard />
            </section>
        </div>
    );
}
