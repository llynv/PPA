import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Decision, BettingRound, Card } from "../../types/poker";
import { suitSymbol, suitColor } from "../../lib/deck";
import { useGameStore } from "../../store/gameStore";

// ── Types & Constants ───────────────────────────────────────────────

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

// ── Helpers ─────────────────────────────────────────────────────────

function formatAction(action: string, amount?: number, isAllIn?: boolean): string {
    if (isAllIn && (action === "bet" || action === "raise" || action === "call")) {
        return amount != null && amount > 0
            ? `All-in $${amount.toLocaleString()}`
            : "All-in";
    }
    const label = action.charAt(0).toUpperCase() + action.slice(1);
    if (amount != null && amount > 0) {
        return `${label} $${amount.toLocaleString()}`;
    }
    return label;
}

function isCorrectAction(decision: Decision): boolean {
    return decision.heroAction === decision.optimalAction;
}

function getDecisionColor(decision: Decision): {
    text: string;
    bg: string;
    label: string;
} {
    if (isCorrectAction(decision)) {
        return {
            text: "text-emerald-400",
            bg: "bg-emerald-500/10 border-emerald-500/30",
            label: "Correct",
        };
    }
    if (decision.evDiff >= 2) {
        return {
            text: "text-red-400",
            bg: "bg-red-500/10 border-red-500/30",
            label: "Major mistake",
        };
    }
    if (decision.evDiff >= 0.5) {
        return {
            text: "text-amber-400",
            bg: "bg-amber-500/10 border-amber-500/30",
            label: "Minor mistake",
        };
    }
    return {
        text: "text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/30",
        label: "Suboptimal",
    };
}

function generateExplanation(decision: Decision): string {
    if (decision.reasoning) return decision.reasoning;

    const correct = isCorrectAction(decision);
    const equityStr =
        decision.equity != null
            ? `${Math.round(decision.equity * 100)}% equity`
            : null;
    const potOddsStr =
        decision.potOdds != null
            ? `${Math.round(decision.potOdds * 100)}% pot odds`
            : null;

    if (correct) {
        const parts = ["Good play."];
        if (equityStr && potOddsStr) {
            parts.push(
                `With ${equityStr} facing ${potOddsStr}, ${formatAction(decision.heroAction).toLowerCase()} is the highest EV action.`,
            );
        } else if (equityStr) {
            parts.push(
                `With ${equityStr}, ${formatAction(decision.heroAction).toLowerCase()} is correct.`,
            );
        }
        return parts.join(" ");
    }

    const parts = ["Suboptimal."];
    parts.push(
        `You ${formatAction(decision.heroAction).toLowerCase()} but ${formatAction(decision.optimalAction).toLowerCase()} was optimal.`,
    );
    if (decision.evDiff > 0) {
        parts.push(`This cost ${decision.evDiff.toFixed(2)} BB in EV.`);
    }
    return parts.join(" ");
}

function getCommunityCardsAtStreet(
    allCards: Card[],
    street: BettingRound,
): Card[] {
    switch (street) {
        case "preflop":
            return [];
        case "flop":
            return allCards.slice(0, 3);
        case "turn":
            return allCards.slice(0, 4);
        case "river":
        case "showdown":
            return allCards.slice(0, 5);
    }
}

// ── Mini Card ───────────────────────────────────────────────────────

function MiniCard({ card }: { card: Card }) {
    const color =
        suitColor(card.suit) === "red" ? "text-red-500" : "text-slate-800";
    return (
        <span
            className={`inline-flex items-center justify-center w-6 h-8 bg-white rounded text-[10px] font-bold border border-slate-300 ${color}`}
        >
            {card.rank}
            {suitSymbol(card.suit)}
        </span>
    );
}

// ── Street Section ──────────────────────────────────────────────────

interface StreetSectionProps {
    round: BettingRound;
    decision: Decision | undefined;
    communityCards: Card[];
}

function StreetSection({
    round,
    decision,
    communityCards,
}: StreetSectionProps) {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const hasDecision = decision != null;

    if (!hasDecision) {
        return (
            <div className="py-3 border-b border-slate-700/50 last:border-b-0 opacity-50">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-slate-600 shrink-0" />
                    <span className="text-sm font-medium text-slate-500">
                        {ROUND_LABELS[round]}
                    </span>
                    <span className="text-sm text-slate-600">
                        No decision made
                    </span>
                </div>
            </div>
        );
    }

    const { text, bg } = getDecisionColor(decision);
    const explanation = generateExplanation(decision);

    return (
        <div
            className={`py-3 border-b border-slate-700/50 last:border-b-0`}
        >
            {/* Street header + board cards */}
            <div className="flex items-center gap-3 mb-2">
                <div
                    className={`w-3 h-3 rounded-full shrink-0 ${isCorrectAction(decision) ? "bg-emerald-500" : decision.evDiff >= 2 ? "bg-red-500" : "bg-amber-500"}`}
                />
                <span className="text-sm font-medium text-slate-300">
                    {ROUND_LABELS[round]}
                </span>
                {/* Board cards for this street */}
                {communityCards.length > 0 && (
                    <div className="flex gap-0.5">
                        {communityCards.map((card, i) => (
                            <MiniCard key={i} card={card} />
                        ))}
                    </div>
                )}
            </div>

            {/* Side-by-side: Hero action vs Optimal */}
            <div className={`ml-6 rounded-lg border p-3 ${bg}`}>
                <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex gap-4 text-sm">
                        <div>
                            <span className="text-slate-500 text-xs">
                                You played:{" "}
                            </span>
                            <span className={`font-medium ${text}`}>
                                {formatAction(
                                    decision.heroAction,
                                    decision.heroAmount,
                                    decision.heroIsAllIn,
                                )}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 text-xs">
                                Optimal:{" "}
                            </span>
                            <span className="font-medium text-slate-200">
                                {formatAction(
                                    decision.optimalAction,
                                    decision.optimalAmount,
                                )}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span
                            className={`text-xs font-medium px-1.5 py-0.5 rounded ${isCorrectAction(decision) ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
                        >
                            {isCorrectAction(decision)
                                ? "0.00 BB"
                                : `-${decision.evDiff.toFixed(2)} BB`}
                        </span>
                    </div>
                </div>

                {/* Natural language explanation or coaching */}
                {decision.coaching ? (
                    <div className="space-y-1.5 text-xs">
                        <p className="text-slate-300 leading-relaxed">{decision.coaching.whatHappened}</p>
                        {decision.coaching.whyMistake && (
                            <p className="text-amber-400/80 leading-relaxed">{decision.coaching.whyMistake}</p>
                        )}
                        <p className="text-emerald-400/80 leading-relaxed">{decision.coaching.whatToDo}</p>
                        {decision.coaching.tip && (
                            <p className="text-sky-400/80 leading-relaxed italic">{decision.coaching.tip}</p>
                        )}
                    </div>
                ) : (
                    <p className="text-slate-300 text-xs leading-relaxed">{explanation}</p>
                )}

                {/* Expandable details */}
                <button
                    onClick={() => setDetailsOpen(!detailsOpen)}
                    className="flex items-center gap-1 mt-2 text-slate-500 hover:text-slate-300 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                    {detailsOpen ? (
                        <ChevronDown className="w-3 h-3" />
                    ) : (
                        <ChevronRight className="w-3 h-3" />
                    )}
                    Details
                </button>

                {detailsOpen && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50 space-y-2">
                        {/* Equity / Pot Odds / SPR */}
                        {(decision.equity != null ||
                            decision.potOdds != null ||
                            decision.spr != null) && (
                            <div className="flex flex-wrap gap-2">
                                {decision.equity != null && (
                                    <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-xs">
                                        Equity:{" "}
                                        {(decision.equity * 100).toFixed(1)}%
                                    </span>
                                )}
                                {decision.potOdds != null && (
                                    <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 text-xs">
                                        Pot Odds:{" "}
                                        {(decision.potOdds * 100).toFixed(1)}%
                                    </span>
                                )}
                                {decision.spr != null && (
                                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs">
                                        SPR: {decision.spr.toFixed(1)}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Draws */}
                        {decision.draws != null &&
                            decision.draws.totalOuts > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {decision.draws.flushDraw && (
                                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs">
                                            Flush draw
                                        </span>
                                    )}
                                    {decision.draws.oesD && (
                                        <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-400 text-xs">
                                            OESD
                                        </span>
                                    )}
                                    {decision.draws.gutshot && (
                                        <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs">
                                            Gutshot
                                        </span>
                                    )}
                                    <span className="text-slate-500 text-xs">
                                        {decision.draws.totalOuts} outs (
                                        {(
                                            decision.draws.drawEquity * 100
                                        ).toFixed(1)}
                                        %)
                                    </span>
                                </div>
                            )}

                        {/* Board texture */}
                        {decision.boardTexture != null && (
                            <p className="text-slate-500 text-xs">
                                Board: {decision.boardTexture.wetness}
                                {decision.boardTexture.isMonotone &&
                                    ", monotone"}
                                {decision.boardTexture.isPaired && ", paired"}
                                {decision.boardTexture.isRainbow &&
                                    ", rainbow"}
                            </p>
                        )}

                        {/* EV by action */}
                        {decision.evByAction != null && (
                            <div className="grid grid-cols-3 gap-1.5 text-xs text-center">
                                <div className="px-2 py-1 rounded bg-red-500/10 text-red-400">
                                    Fold:{" "}
                                    {decision.evByAction.fold.toFixed(2)}
                                </div>
                                <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400">
                                    Call:{" "}
                                    {decision.evByAction.call.toFixed(2)}
                                </div>
                                <div className="px-2 py-1 rounded bg-amber-500/10 text-amber-400">
                                    Raise:{" "}
                                    {decision.evByAction.raise.toFixed(2)}
                                </div>
                            </div>
                        )}

                        {/* Frequencies */}
                        <div className="text-xs text-slate-500">
                            Frequencies: Fold{" "}
                            {Math.round(
                                decision.optimalFrequencies.fold * 100,
                            )}
                            % / Call{" "}
                            {Math.round(
                                decision.optimalFrequencies.call * 100,
                            )}
                            % / Raise{" "}
                            {Math.round(
                                decision.optimalFrequencies.raise * 100,
                            )}
                            %
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Component ──────────────────────────────────────────────────

export function HandTimeline({ decisions }: HandTimelineProps) {
    const handHistory = useGameStore((s) => s.handHistory);
    const latestHand = handHistory[handHistory.length - 1];
    const communityCards = latestHand?.communityCards ?? [];

    const decisionByRound = new Map(decisions.map((d) => [d.round, d]));

    return (
        <div className="bg-slate-800 rounded-xl p-4 md:p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-100 mb-3">
                Decision Review
            </h3>

            <div>
                {ROUND_ORDER.map((round) => {
                    const decision = decisionByRound.get(round);
                    const boardCards = getCommunityCardsAtStreet(
                        communityCards,
                        round,
                    );

                    // Only show streets that either have a decision or have board cards
                    if (!decision && boardCards.length === 0) return null;

                    return (
                        <StreetSection
                            key={round}
                            round={round}
                            decision={decision}
                            communityCards={boardCards}
                        />
                    );
                })}
            </div>
        </div>
    );
}
