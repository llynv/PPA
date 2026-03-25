import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../../store/gameStore";
import { getSessionStats } from "../../lib/analysis";
import { MISTAKE_TYPE_LABELS } from "../../lib/mistake-mappings";
import { generateSessionDebrief } from "../../lib/coaching";
import { useProgressStore } from "../../store/progressStore";
import type { MistakeType } from "../../types/poker";

const CATEGORY_LABELS: Record<string, string> = {
    FREQUENCY: "Frequency mistakes",
    SIZING: "Sizing mistakes",
    AGGRESSION: "Aggression mistakes",
    EQUITY_REALIZATION: "Equity realization",
};

export function SessionPatterns() {
    const navigate = useNavigate();
    const sessionAnalyses = useGameStore((s) => s.sessionAnalyses);
    const sessions = useProgressStore((s) => s.sessions);
    const conceptMastery = useProgressStore((s) => s.conceptMastery);

    const recentSessions = useMemo(
        () => [...sessions].reverse().slice(0, 5),
        [sessions],
    );

    if (sessionAnalyses.length < 3) return null;

    const stats = getSessionStats(sessionAnalyses);

    if (!stats.weakestType) return null;

    const categoryEntries = Object.entries(stats.mistakesByCategory).sort(
        (a, b) => b[1].totalEvLoss - a[1].totalEvLoss,
    );

    const latestAnalysis = sessionAnalyses[sessionAnalyses.length - 1];
    const debrief = generateSessionDebrief(latestAnalysis, recentSessions, conceptMastery);

    const drillConcept = debrief.suggestedDrill ?? "cbet_value";

    return (
        <div className="bg-slate-800 rounded-xl p-4 md:p-6 shadow-lg space-y-4">
            <h3 className="text-lg font-semibold text-slate-100">
                Session Patterns
                <span className="text-slate-500 text-sm font-normal ml-2">
                    ({stats.totalHands} hands)
                </span>
            </h3>

            {/* Debrief headline */}
            <p className="text-slate-300 text-sm font-medium leading-relaxed">
                {debrief.headline}
            </p>

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
                    {MISTAKE_TYPE_LABELS[stats.weakestType.type as MistakeType] ?? stats.weakestType.type}
                </p>
                <p className="text-slate-500 text-xs">
                    {stats.weakestType.count} mistakes · -{stats.weakestType.totalEvLoss.toFixed(1)} BB total
                </p>
            </div>

            {/* Debrief details */}
            {debrief.details.length > 0 && (
                <ul className="space-y-1">
                    {debrief.details.map((detail, i) => (
                        <li key={i} className="text-xs text-slate-400 leading-relaxed flex gap-2">
                            <span className="text-slate-600 shrink-0">•</span>
                            <span>{detail}</span>
                        </li>
                    ))}
                </ul>
            )}

            {/* Drill recommendation */}
            <button
                onClick={() => navigate(`/practice/drills?concept=${drillConcept}`)}
                className="w-full py-2 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 text-sm font-medium hover:bg-emerald-600/30 transition-colors"
            >
                Drill: {MISTAKE_TYPE_LABELS[stats.weakestType.type as MistakeType] ?? "Practice"} &rarr;
            </button>
        </div>
    );
}
