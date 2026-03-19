import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Mistake } from "../../types/poker";

interface MistakeCardProps {
    mistake: Mistake;
    index: number;
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

export function MistakeCard({ mistake, index }: MistakeCardProps) {
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
                </div>
            )}
        </div>
    );
}
