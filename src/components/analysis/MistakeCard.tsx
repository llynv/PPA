import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Mistake, Decision } from "../../types/poker";

interface MistakeCardProps {
    mistake: Mistake;
    index: number;
    decision?: Decision;
}

const SEVERITY_COLORS: Record<Mistake["severity"], string> = {
    minor: "#f59e0b", // amber-500
    moderate: "#f97316", // orange-500
    major: "#ef4444", // red-500
};

const SEVERITY_BG: Record<Mistake["severity"], string> = {
    minor: "bg-amber-500/20 text-amber-400",
    moderate: "bg-orange-500/20 text-orange-400",
    major: "bg-red-500/20 text-red-400",
};

function formatAction(action: string): string {
    return action.charAt(0).toUpperCase() + action.slice(1);
}

function formatRound(round: string): string {
    return round.charAt(0).toUpperCase() + round.slice(1);
}

export function MistakeCard({ mistake, index, decision }: MistakeCardProps) {
    const [expanded, setExpanded] = useState(false);

    const borderColor = SEVERITY_COLORS[mistake.severity];
    const badgeBg = SEVERITY_BG[mistake.severity];

    return (
        <div
            className="bg-slate-800 rounded-lg shadow-lg border-l-4 overflow-hidden"
            style={{ borderLeftColor: borderColor }}
        >
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left p-4 focus:outline-none"
            >
                {/* Header row */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="text-slate-500 text-sm font-mono">
                            #{index + 1}
                        </span>
                        <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeBg}`}
                        >
                            {mistake.severity}
                        </span>
                        <span className="text-slate-300 text-sm font-medium truncate">
                            {formatRound(mistake.round)}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-red-400 text-sm font-medium">
                            -{Math.abs(mistake.evLoss).toFixed(1)} BB
                        </span>
                        {expanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                        ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                    </div>
                </div>

                {/* Brief summary when collapsed */}
                {!expanded && (
                    <p className="text-slate-400 text-sm mt-1 truncate">
                        {mistake.description}
                    </p>
                )}
            </button>

            {/* Expanded content */}
            {expanded && (
                <div className="px-4 pb-4 space-y-3">
                    <p className="text-slate-300 text-sm">
                        {mistake.description}
                    </p>

                    {/* Reasoning from analysis engine */}
                    {decision?.reasoning != null && (
                        <p className="text-slate-400 text-sm italic border-l-2 border-slate-600 pl-3">
                            {decision.reasoning}
                        </p>
                    )}

                    {/* Equity / Pot Odds / SPR badges */}
                    {(decision?.equity != null || decision?.potOdds != null || decision?.spr != null) && (
                        <div className="flex flex-wrap gap-2">
                            {decision.equity != null && (
                                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-xs font-medium">
                                    Equity: {(decision.equity * 100).toFixed(1)}%
                                </span>
                            )}
                            {decision.potOdds != null && (
                                <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 text-xs font-medium">
                                    Pot Odds: {(decision.potOdds * 100).toFixed(1)}%
                                </span>
                            )}
                            {decision.spr != null && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-medium">
                                    SPR: {decision.spr.toFixed(1)}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Bet sizing analysis */}
                    {decision?.betSizeAnalysis != null && (
                        <div className="text-sm text-slate-400">
                            <span className="text-slate-500">Sizing: </span>
                            <span>{decision.betSizeAnalysis.heroSize.toFixed(1)} BB</span>
                            <span className="text-slate-500"> vs optimal </span>
                            <span className="text-emerald-400">
                                {decision.betSizeAnalysis.optimalSize.toFixed(1)} BB
                            </span>
                            {decision.betSizeAnalysis.sizingError > 0 && (
                                <span className="text-red-400 ml-1">
                                    ({(decision.betSizeAnalysis.sizingError * 100).toFixed(0)}% off)
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex gap-4 text-sm">
                        <div>
                            <span className="text-slate-500">
                                Your action:{" "}
                            </span>
                            <span className="text-red-400 font-medium">
                                {formatAction(mistake.heroAction)}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500">Optimal: </span>
                            <span className="text-emerald-400 font-medium">
                                {formatAction(mistake.optimalAction)}
                            </span>
                        </div>
                    </div>

                    <div className="text-sm">
                        <span className="text-slate-500">EV Lost: </span>
                        <span className="text-red-400 font-medium">
                            -{Math.abs(mistake.evLoss).toFixed(2)} BB
                        </span>
                    </div>

                    {/* EV by action from decision */}
                    {decision?.evByAction != null && (
                        <div className="grid grid-cols-3 gap-2 text-xs text-center">
                            <div className="px-2 py-1 rounded bg-red-500/10 text-red-400">
                                Fold: {decision.evByAction.fold.toFixed(2)} BB
                            </div>
                            <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400">
                                Call: {decision.evByAction.call.toFixed(2)} BB
                            </div>
                            <div className="px-2 py-1 rounded bg-amber-500/10 text-amber-400">
                                Raise: {decision.evByAction.raise.toFixed(2)} BB
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
