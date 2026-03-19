import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
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

function formatAction(action: string, amount?: number): string {
    const label = action.charAt(0).toUpperCase() + action.slice(1);
    if (amount != null && amount > 0) {
        return `${label} $${amount.toLocaleString()}`;
    }
    return label;
}

function formatRound(round: string): string {
    return round.charAt(0).toUpperCase() + round.slice(1);
}

/** Build a natural language explanation for this mistake. */
function generateNarrative(mistake: Mistake, decision?: Decision): string {
    if (decision?.reasoning) return decision.reasoning;

    const equityStr =
        decision?.equity != null
            ? `${Math.round(decision.equity * 100)}% equity`
            : null;
    const potOddsStr =
        decision?.potOdds != null
            ? `${Math.round(decision.potOdds * 100)}% pot odds`
            : null;

    const parts: string[] = [];
    parts.push(
        `On the ${mistake.round}, you chose to ${mistake.heroAction} when ${mistake.optimalAction} was the better play.`,
    );

    if (equityStr && potOddsStr) {
        parts.push(
            `With ${equityStr} and ${potOddsStr}, the math favored a ${mistake.optimalAction}.`,
        );
    } else if (equityStr) {
        parts.push(
            `With ${equityStr}, ${mistake.optimalAction} would have been more profitable.`,
        );
    }

    if (mistake.evLoss > 0) {
        parts.push(
            `This decision cost you ${Math.abs(mistake.evLoss).toFixed(2)} BB in expected value.`,
        );
    }

    return parts.join(" ");
}

export function MistakeCard({ mistake, index, decision }: MistakeCardProps) {
    const [expanded, setExpanded] = useState(false);

    const borderColor = SEVERITY_COLORS[mistake.severity];
    const badgeBg = SEVERITY_BG[mistake.severity];
    const narrative = generateNarrative(mistake, decision);

    return (
        <div
            className="bg-slate-800 rounded-lg shadow-lg border-l-4 overflow-hidden"
            style={{ borderLeftColor: borderColor }}
        >
            {/* Clickable header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full text-left p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                aria-expanded={expanded}
            >
                {/* Top row: index, severity badge, round, EV cost */}
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
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                    </div>
                </div>

                {/* Collapsed summary — narrative lead sentence */}
                {!expanded && (
                    <p className="text-slate-400 text-sm mt-2 line-clamp-2 leading-relaxed">
                        {narrative}
                    </p>
                )}
            </button>

            {/* Expanded educational content */}
            {expanded && (
                <div className="px-4 pb-4 space-y-4">
                    {/* 1. Natural language narrative (large, readable) */}
                    <p className="text-slate-200 text-sm leading-relaxed">
                        {narrative}
                    </p>

                    {/* 2. EV cost callout */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/20">
                        <span className="text-red-400 text-sm font-semibold">
                            Cost: -{Math.abs(mistake.evLoss).toFixed(2)} BB
                        </span>
                        <span className="text-slate-500 text-xs">
                            in expected value
                        </span>
                    </div>

                    {/* 3. Two-column comparison: "What you did" vs "What was optimal" */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                            <p className="text-slate-500 text-xs mb-1">
                                What you did
                            </p>
                            <p className="text-red-400 font-medium text-sm">
                                {formatAction(
                                    mistake.heroAction,
                                    decision?.heroAmount,
                                )}
                            </p>
                        </div>
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                            <p className="text-slate-500 text-xs mb-1">
                                What was optimal
                            </p>
                            <p className="text-emerald-400 font-medium text-sm">
                                {formatAction(
                                    mistake.optimalAction,
                                    decision?.optimalAmount,
                                )}
                            </p>
                        </div>
                    </div>

                    {/* 4. Board texture & draw info as visual badges */}
                    {(decision?.draws != null ||
                        decision?.boardTexture != null) && (
                        <div className="flex flex-wrap gap-1.5">
                            {/* Board texture badges */}
                            {decision.boardTexture != null && (
                                <>
                                    <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs">
                                        {decision.boardTexture.wetness}
                                    </span>
                                    {decision.boardTexture.isMonotone && (
                                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">
                                            Monotone
                                        </span>
                                    )}
                                    {decision.boardTexture.isPaired && (
                                        <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs">
                                            Paired
                                        </span>
                                    )}
                                    {decision.boardTexture.isRainbow && (
                                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-xs">
                                            Rainbow
                                        </span>
                                    )}
                                </>
                            )}
                            {/* Draw badges */}
                            {decision.draws != null &&
                                decision.draws.totalOuts > 0 && (
                                    <>
                                        {decision.draws.flushDraw && (
                                            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs">
                                                Flush draw
                                            </span>
                                        )}
                                        {decision.draws.oesD && (
                                            <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-400 text-xs">
                                                OESD
                                            </span>
                                        )}
                                        {decision.draws.gutshot && (
                                            <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs">
                                                Gutshot
                                            </span>
                                        )}
                                        <span className="text-slate-500 text-xs self-center">
                                            {decision.draws.totalOuts} outs (
                                            {(
                                                decision.draws.drawEquity * 100
                                            ).toFixed(1)}
                                            %)
                                        </span>
                                    </>
                                )}
                        </div>
                    )}

                    {/* 5. Equity / Pot Odds / SPR pills */}
                    {(decision?.equity != null ||
                        decision?.potOdds != null ||
                        decision?.spr != null) && (
                        <div className="flex flex-wrap gap-2">
                            {decision.equity != null && (
                                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-xs font-medium">
                                    Equity:{" "}
                                    {(decision.equity * 100).toFixed(1)}%
                                </span>
                            )}
                            {decision.potOdds != null && (
                                <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 text-xs font-medium">
                                    Pot Odds:{" "}
                                    {(decision.potOdds * 100).toFixed(1)}%
                                </span>
                            )}
                            {decision.spr != null && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-medium">
                                    SPR: {decision.spr.toFixed(1)}
                                </span>
                            )}
                        </div>
                    )}

                    {/* 6. Bet sizing analysis (if applicable) */}
                    {decision?.betSizeAnalysis != null && (
                        <div className="text-sm text-slate-400">
                            <span className="text-slate-500">Sizing: </span>
                            <span>
                                {decision.betSizeAnalysis.heroSize.toFixed(1)} BB
                            </span>
                            <span className="text-slate-500"> vs optimal </span>
                            <span className="text-emerald-400">
                                {decision.betSizeAnalysis.optimalSize.toFixed(1)}{" "}
                                BB
                            </span>
                            {decision.betSizeAnalysis.sizingError > 0 && (
                                <span className="text-red-400 ml-1">
                                    (
                                    {(
                                        decision.betSizeAnalysis.sizingError *
                                        100
                                    ).toFixed(0)}
                                    % off)
                                </span>
                            )}
                        </div>
                    )}

                    {/* 7. EV by action breakdown */}
                    {decision?.evByAction != null && (
                        <div className="grid grid-cols-3 gap-2 text-xs text-center">
                            <div className="px-2 py-1.5 rounded bg-red-500/10 text-red-400">
                                Fold:{" "}
                                {decision.evByAction.fold.toFixed(2)} BB
                            </div>
                            <div className="px-2 py-1.5 rounded bg-emerald-500/10 text-emerald-400">
                                Call:{" "}
                                {decision.evByAction.call.toFixed(2)} BB
                            </div>
                            <div className="px-2 py-1.5 rounded bg-amber-500/10 text-amber-400">
                                Raise:{" "}
                                {decision.evByAction.raise.toFixed(2)} BB
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
