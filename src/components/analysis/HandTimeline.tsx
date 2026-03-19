import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Decision, BettingRound } from "../../types/poker";

interface HandTimelineProps {
    decisions: Decision[];
}

const ROUND_ORDER: BettingRound[] = ["preflop", "flop", "turn", "river"];

const ROUND_LABELS: Record<BettingRound, string> = {
    preflop: "Preflop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
    showdown: "Showdown",
};

function formatAction(action: string, amount?: number): string {
    const label = action.charAt(0).toUpperCase() + action.slice(1);
    if (amount != null && amount > 0) {
        return `${label} $${amount}`;
    }
    return label;
}

function isCorrectAction(decision: Decision): boolean {
    return decision.heroAction === decision.optimalAction;
}

interface StepProps {
    decision: Decision | undefined;
    round: BettingRound;
    isLast: boolean;
}

function TimelineStep({ decision, round, isLast }: StepProps) {
    const [expanded, setExpanded] = useState(false);

    const hasDecision = decision != null;
    const correct = hasDecision && isCorrectAction(decision);

    // Colors: green if correct, red if mistake, gray if no decision
    const dotColor = !hasDecision
        ? "bg-slate-600"
        : correct
          ? "bg-emerald-500"
          : "bg-red-500";

    const lineColor = !hasDecision ? "bg-slate-700" : "bg-slate-600";

    return (
        <div className="flex-1 min-w-0">
            <button
                onClick={() => hasDecision && setExpanded(!expanded)}
                className="w-full text-left focus:outline-none"
                disabled={!hasDecision}
            >
                {/* Step indicator row */}
                <div className="flex items-center">
                    <div
                        className={`w-4 h-4 rounded-full shrink-0 ${dotColor}`}
                    />
                    {!isLast && (
                        <div
                            className={`flex-1 h-0.5 ${lineColor} ${!hasDecision ? "opacity-40" : ""}`}
                        />
                    )}
                </div>

                {/* Labels */}
                <div className="mt-2 pr-2">
                    <p className="text-sm font-medium text-slate-300">
                        {ROUND_LABELS[round]}
                    </p>
                    {hasDecision ? (
                        <p
                            className={`text-sm ${correct ? "text-emerald-400" : "text-red-400"}`}
                        >
                            {formatAction(
                                decision.heroAction,
                                decision.heroAmount,
                            )}
                        </p>
                    ) : (
                        <p className="text-sm text-slate-600">—</p>
                    )}
                    {hasDecision && (
                        <span className="text-slate-500">
                            {expanded ? (
                                <ChevronUp className="w-3 h-3 mt-1" />
                            ) : (
                                <ChevronDown className="w-3 h-3 mt-1" />
                            )}
                        </span>
                    )}
                </div>
            </button>

            {/* Expanded detail */}
            {expanded && decision && (
                <div className="mt-2 p-3 bg-slate-700/50 rounded-lg text-sm space-y-1">
                    <p className="text-slate-300">
                        <span className="text-slate-500">Optimal:</span>{" "}
                        {formatAction(
                            decision.optimalAction,
                            decision.optimalAmount,
                        )}
                    </p>
                    <div className="text-slate-400">
                        <p>
                            Fold:{" "}
                            {Math.round(decision.optimalFrequencies.fold * 100)}
                            %
                        </p>
                        <p>
                            Call:{" "}
                            {Math.round(decision.optimalFrequencies.call * 100)}
                            %
                        </p>
                        <p>
                            Raise:{" "}
                            {Math.round(
                                decision.optimalFrequencies.raise * 100,
                            )}
                            %
                        </p>
                    </div>
                    <p
                        className={`font-medium ${decision.evDiff <= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                        EV:{" "}
                        {decision.evDiff === 0
                            ? "0.00"
                            : `-${decision.evDiff.toFixed(2)}`}{" "}
                        BB
                    </p>
                </div>
            )}
        </div>
    );
}

export function HandTimeline({ decisions }: HandTimelineProps) {
    const decisionByRound = new Map(decisions.map((d) => [d.round, d]));

    return (
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">
                Hand Timeline
            </h3>

            {/* Desktop: horizontal, Mobile: vertical */}
            {/* Horizontal layout */}
            <div className="hidden sm:flex gap-0">
                {ROUND_ORDER.map((round, i) => (
                    <TimelineStep
                        key={round}
                        round={round}
                        decision={decisionByRound.get(round)}
                        isLast={i === ROUND_ORDER.length - 1}
                    />
                ))}
            </div>

            {/* Mobile: vertical layout */}
            <div className="sm:hidden space-y-3">
                {ROUND_ORDER.map((round, i) => {
                    const decision = decisionByRound.get(round);
                    const hasDecision = decision != null;
                    const correct = hasDecision && isCorrectAction(decision);
                    const dotColor = !hasDecision
                        ? "bg-slate-600"
                        : correct
                          ? "bg-emerald-500"
                          : "bg-red-500";

                    return (
                        <MobileStep
                            key={round}
                            round={round}
                            decision={decision}
                            dotColor={dotColor}
                            isLast={i === ROUND_ORDER.length - 1}
                        />
                    );
                })}
            </div>
        </div>
    );
}

interface MobileStepProps {
    round: BettingRound;
    decision: Decision | undefined;
    dotColor: string;
    isLast: boolean;
}

function MobileStep({ round, decision, dotColor, isLast }: MobileStepProps) {
    const [expanded, setExpanded] = useState(false);
    const hasDecision = decision != null;
    const correct = hasDecision && isCorrectAction(decision);

    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full shrink-0 ${dotColor}`} />
                {!isLast && <div className="w-0.5 flex-1 bg-slate-700 mt-1" />}
            </div>
            <div className="flex-1 pb-3">
                <button
                    onClick={() => hasDecision && setExpanded(!expanded)}
                    className="w-full text-left focus:outline-none"
                    disabled={!hasDecision}
                >
                    <p className="text-sm font-medium text-slate-300">
                        {ROUND_LABELS[round]}
                    </p>
                    {hasDecision ? (
                        <p
                            className={`text-sm ${correct ? "text-emerald-400" : "text-red-400"}`}
                        >
                            {formatAction(
                                decision.heroAction,
                                decision.heroAmount,
                            )}
                        </p>
                    ) : (
                        <p className="text-sm text-slate-600">—</p>
                    )}
                </button>

                {expanded && decision && (
                    <div className="mt-2 p-3 bg-slate-700/50 rounded-lg text-sm space-y-1">
                        <p className="text-slate-300">
                            <span className="text-slate-500">Optimal:</span>{" "}
                            {formatAction(
                                decision.optimalAction,
                                decision.optimalAmount,
                            )}
                        </p>
                        <div className="text-slate-400">
                            <p>
                                Fold:{" "}
                                {Math.round(
                                    decision.optimalFrequencies.fold * 100,
                                )}
                                %
                            </p>
                            <p>
                                Call:{" "}
                                {Math.round(
                                    decision.optimalFrequencies.call * 100,
                                )}
                                %
                            </p>
                            <p>
                                Raise:{" "}
                                {Math.round(
                                    decision.optimalFrequencies.raise * 100,
                                )}
                                %
                            </p>
                        </div>
                        <p
                            className={`font-medium ${decision.evDiff <= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                            EV:{" "}
                            {decision.evDiff === 0
                                ? "0.00"
                                : `-${decision.evDiff.toFixed(2)}`}{" "}
                            BB
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
