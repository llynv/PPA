import { useNavigate } from "react-router-dom";
import { useGameStore } from "../../store/gameStore";
import { getSessionStats } from "../../lib/analysis";

const CATEGORY_LABELS: Record<string, string> = {
    FREQUENCY: "Frequency mistakes",
    SIZING: "Sizing mistakes",
    AGGRESSION: "Aggression mistakes",
    EQUITY_REALIZATION: "Equity realization",
};

const TYPE_LABELS: Record<string, string> = {
    OVERFOLD: "Overfolding",
    OVERCALL: "Overcalling",
    MISSED_VALUE_BET: "Missed value bets",
    MISSED_CBET: "Missed c-bets",
    BAD_SIZING_OVER: "Oversized bets",
    BAD_SIZING_UNDER: "Undersized bets",
    CALLING_WITHOUT_ODDS: "Calling without odds",
    BLUFF_WRONG_SPOT: "Bad bluff spots",
    MISSED_DRAW_PLAY: "Passive draw play",
    PASSIVE_WITH_EQUITY: "Too passive with equity",
};

const MISTAKE_TO_CONCEPT: Record<string, string> = {
    OVERFOLD: "cold_call",
    OVERCALL: "bluff_catch",
    MISSED_VALUE_BET: "value_bet_thin",
    MISSED_CBET: "cbet_value",
    BAD_SIZING_OVER: "cbet_value",
    BAD_SIZING_UNDER: "cbet_value",
    CALLING_WITHOUT_ODDS: "bluff_catch",
    BLUFF_WRONG_SPOT: "river_bluff",
    MISSED_DRAW_PLAY: "semi_bluff",
    PASSIVE_WITH_EQUITY: "value_bet_thin",
};

export function SessionPatterns() {
    const navigate = useNavigate();
    const sessionAnalyses = useGameStore((s) => s.sessionAnalyses);

    if (sessionAnalyses.length < 3) return null;

    const stats = getSessionStats(sessionAnalyses);

    if (!stats.weakestType) return null;

    const categoryEntries = Object.entries(stats.mistakesByCategory).sort(
        (a, b) => b[1].totalEvLoss - a[1].totalEvLoss,
    );

    // Improvement trend: compare last 3 hands' EV loss to first 3
    const firstThreeEvLoss = sessionAnalyses
        .slice(0, 3)
        .reduce((sum, a) => sum + a.totalEvLoss, 0);
    const lastThreeEvLoss = sessionAnalyses
        .slice(-3)
        .reduce((sum, a) => sum + a.totalEvLoss, 0);
    const improving = lastThreeEvLoss < firstThreeEvLoss;

    const drillConcept = MISTAKE_TO_CONCEPT[stats.weakestType.type] ?? "cbet_value";

    return (
        <div className="bg-slate-800 rounded-xl p-4 md:p-6 shadow-lg space-y-4">
            <h3 className="text-lg font-semibold text-slate-100">
                Session Patterns
                <span className="text-slate-500 text-sm font-normal ml-2">
                    ({stats.totalHands} hands)
                </span>
            </h3>

            {/* Mistake frequency by category */}
            {categoryEntries.length > 0 && (
                <div className="space-y-2">
                    {categoryEntries.map(([cat, data]) => {
                        const maxEv = categoryEntries[0][1].totalEvLoss || 1;
                        const pct = (data.totalEvLoss / maxEv) * 100;
                        return (
                            <div key={cat}>
                                <div className="flex justify-between text-xs mb-0.5">
                                    <span className="text-slate-400">{CATEGORY_LABELS[cat] ?? cat}</span>
                                    <span className="text-slate-500">
                                        {data.count}x · -{data.totalEvLoss.toFixed(1)} BB
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-red-500/60 rounded-full transition-all"
                                        style={{ width: `${Math.max(pct, 4)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Weakest concept */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-amber-400 text-xs font-medium mb-0.5">Biggest leak</p>
                <p className="text-slate-200 text-sm font-medium">
                    {TYPE_LABELS[stats.weakestType.type] ?? stats.weakestType.type}
                </p>
                <p className="text-slate-500 text-xs">
                    {stats.weakestType.count} mistakes · -{stats.weakestType.totalEvLoss.toFixed(1)} BB total
                </p>
            </div>

            {/* Improvement trend */}
            {sessionAnalyses.length >= 6 && (
                <div className={`text-xs font-medium ${improving ? "text-emerald-400" : "text-amber-400"}`}>
                    {improving
                        ? "Improving — your recent hands show fewer mistakes"
                        : "Steady — keep practicing to reduce mistakes"}
                </div>
            )}

            {/* Drill recommendation */}
            <button
                onClick={() => navigate(`/practice/drills?concept=${drillConcept}`)}
                className="w-full py-2 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 text-sm font-medium hover:bg-emerald-600/30 transition-colors"
            >
                Drill: {TYPE_LABELS[stats.weakestType.type] ?? "Practice"} &rarr;
            </button>
        </div>
    );
}
