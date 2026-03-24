import { Link } from 'react-router-dom';
import { useDrillStore } from '../../store/drillStore';
import type { SpotCategory } from '../../types/drill';

const CATEGORY_LABELS: Record<SpotCategory, string> = {
    preflop: 'Preflop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
};

interface CategoryStats {
    count: number;
    correct: number;
}

export function DrillSummary() {
    const session = useDrillStore((s) => s.session);

    if (!session || session.results.length === 0) return null;

    const { results, queue, bestStreak } = session;
    const total = results.length;
    const correctCount = results.filter((r) => r.isCorrect).length;
    const accuracy = Math.round((correctCount / total) * 100);
    const avgEvDelta = results.reduce((sum, r) => sum + r.evDelta, 0) / total;

    // Build per-category stats by matching results to queue spots
    const categoryMap = new Map<SpotCategory, CategoryStats>();
    for (let i = 0; i < results.length; i++) {
        const spot = queue[i];
        const result = results[i];
        const existing = categoryMap.get(spot.category);
        if (existing) {
            existing.count++;
            if (result.isCorrect) existing.correct++;
        } else {
            categoryMap.set(spot.category, {
                count: 1,
                correct: result.isCorrect ? 1 : 0,
            });
        }
    }

    // Sort categories in street order
    const categoryOrder: SpotCategory[] = ['preflop', 'flop', 'turn', 'river'];
    const categories = categoryOrder.filter((c) => categoryMap.has(c));

    const handleDrillAgain = () => {
        useDrillStore.getState().resetSession();
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-lg mx-auto w-full">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-2xl font-bold text-neutral-100 mb-1">
                    Session Complete
                </h1>
                <p className="text-sm text-neutral-400">
                    Here's how you did.
                </p>
            </div>

            {/* Top-level stats grid */}
            <div className="grid grid-cols-2 gap-3">
                <StatCard label="Spots Drilled" value={String(total)} />
                <StatCard
                    label="Accuracy"
                    value={`${accuracy}%`}
                    valueColor={accuracy >= 70 ? 'text-emerald-400' : accuracy >= 40 ? 'text-amber-400' : 'text-red-400'}
                />
                <StatCard label="Best Streak" value={String(bestStreak)} />
                <StatCard
                    label="Avg EV Delta"
                    value={`${avgEvDelta >= 0 ? '+' : ''}${avgEvDelta.toFixed(1)} BB`}
                    valueColor={avgEvDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}
                />
            </div>

            {/* Category breakdown */}
            {categories.length > 0 && (
                <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">
                        Breakdown by Category
                    </h3>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-neutral-500 text-xs uppercase tracking-wide">
                                <th className="text-left pb-2 font-medium">Category</th>
                                <th className="text-right pb-2 font-medium">Spots</th>
                                <th className="text-right pb-2 font-medium">Accuracy</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((cat) => {
                                const stats = categoryMap.get(cat)!;
                                const catAccuracy = Math.round((stats.correct / stats.count) * 100);
                                return (
                                    <tr key={cat} className="border-t border-neutral-800">
                                        <td className="py-2 text-neutral-100 font-medium">
                                            {CATEGORY_LABELS[cat]}
                                        </td>
                                        <td className="py-2 text-right text-neutral-300">
                                            {stats.count}
                                        </td>
                                        <td className={`py-2 text-right font-medium ${catAccuracy >= 70 ? 'text-emerald-400' : catAccuracy >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                                            {catAccuracy}%
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* CTAs */}
            <button
                onClick={handleDrillAgain}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 px-4 rounded-lg font-bold text-base transition-colors min-h-[48px]"
            >
                Drill Again
            </button>

            <Link
                to="/practice"
                className="block w-full text-center text-sm text-neutral-400 hover:text-neutral-200 transition-colors py-2"
            >
                Back to Practice
            </Link>
        </div>
    );
}

// ── Helpers ─────────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    valueColor = 'text-neutral-100',
}: {
    label: string;
    value: string;
    valueColor?: string;
}) {
    return (
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-3 text-center">
            <p className="text-xs text-neutral-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
        </div>
    );
}
