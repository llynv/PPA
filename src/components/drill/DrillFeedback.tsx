import { useDrillStore, mapToFrequencyKey } from "../../store/drillStore";
import { useProgressStore } from "../../store/progressStore";
import { FrequencyBar } from "./FrequencyBar";
import { CONCEPT_LABELS } from "../../lib/concept-labels";
import { generateDrillCoaching } from "../../lib/coaching";
import { CONCEPT_TEACHINGS } from "../../data/conceptTeachings";

// ── Drill Feedback Dashboard ────────────────────────────────────────
// Shown after the hero submits an answer. Displays verdict, GTO
// frequencies, EV comparison, concept explanation, and context badges.

type Verdict = "correct" | "acceptable" | "mistake";

function getVerdict(isCorrect: boolean, heroAction: string, optimalAction: string): Verdict {
    if (isCorrect && heroAction === optimalAction) return "correct";
    if (isCorrect) return "acceptable";
    return "mistake";
}

const VERDICT_CONFIG: Record<Verdict, { label: string; bg: string; border: string; text: string }> = {
    correct: {
        label: "Correct",
        bg: "bg-emerald-500/15",
        border: "border-emerald-500/30",
        text: "text-emerald-400",
    },
    acceptable: {
        label: "Acceptable",
        bg: "bg-amber-500/15",
        border: "border-amber-500/30",
        text: "text-amber-400",
    },
    mistake: {
        label: "Mistake",
        bg: "bg-red-500/15",
        border: "border-red-500/30",
        text: "text-red-400",
    },
};

export function DrillFeedback() {
    const currentResult = useDrillStore((s) => s.currentResult);
    const session = useDrillStore((s) => s.session);
    const nextSpot = useDrillStore((s) => s.nextSpot);
    const conceptMastery = useProgressStore((s) => s.conceptMastery);

    if (!currentResult || !session) return null;

    const spot = session.queue[session.currentIndex];
    if (!spot) return null;
    const { optimalResult, heroAction, isCorrect, evDelta } = currentResult;
    const verdict = getVerdict(isCorrect, heroAction, optimalResult.optimalAction);
    const vc = VERDICT_CONFIG[verdict];

    const heroEv = optimalResult.evByAction[mapToFrequencyKey(heroAction)] ?? 0;
    const optimalEv = Math.max(
        optimalResult.evByAction.fold,
        optimalResult.evByAction.call,
        optimalResult.evByAction.raise,
    );

    const isLastSpot = session.currentIndex >= session.queue.length - 1;

    const coaching = generateDrillCoaching(spot, currentResult, conceptMastery[spot.concept], optimalResult);

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-lg mx-auto w-full">
            {/* 1. Verdict banner */}
            <div className={`rounded-lg border px-4 py-3 text-center ${vc.bg} ${vc.border}`}>
                <span className={`text-lg font-bold ${vc.text}`}>{vc.label}</span>
                {verdict === "acceptable" && (
                    <p className="text-sm text-neutral-400 mt-1">
                        Your {capitalize(heroAction)} is a valid mixed-strategy play,
                        but {capitalize(optimalResult.optimalAction)} is optimal.
                    </p>
                )}
                {verdict === "mistake" && (
                    <p className="text-sm text-neutral-400 mt-1">
                        The optimal play was {capitalize(optimalResult.optimalAction)}.
                    </p>
                )}
            </div>

            {/* 2. GTO Frequency Bar */}
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 space-y-2">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                    GTO Frequencies
                </h3>
                <FrequencyBar
                    frequencies={optimalResult.frequencies}
                    heroAction={heroAction}
                />
            </div>

            {/* 3. EV Comparison */}
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">
                    Expected Value
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                        <p className="text-xs text-neutral-500 mb-1">Your EV</p>
                        <p className={`text-sm font-bold ${evDelta < 0 ? "text-red-400" : "text-neutral-100"}`}>
                            {heroEv >= 0 ? "+" : ""}{heroEv.toFixed(2)} BB
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 mb-1">Optimal EV</p>
                        <p className="text-sm font-bold text-emerald-400">
                            {optimalEv >= 0 ? "+" : ""}{optimalEv.toFixed(2)} BB
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-neutral-500 mb-1">EV Delta</p>
                        <p className={`text-sm font-bold ${evDelta < 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {evDelta >= 0 ? "+" : ""}{evDelta.toFixed(2)} BB
                        </p>
                    </div>
                </div>
            </div>

            {/* 4. Coaching card */}
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-medium">
                        {CONCEPT_LABELS[spot.concept]}
                    </span>
                </div>
                {/* What happened */}
                <div>
                    <p className="text-neutral-500 text-xs font-medium mb-0.5">What happened</p>
                    <p className="text-neutral-300 text-sm leading-relaxed">{coaching.whatHappened}</p>
                </div>
                {/* Why it's a mistake (only for mistakes) */}
                {coaching.whyMistake && (
                    <div>
                        <p className="text-amber-500 text-xs font-medium mb-0.5">Why it&apos;s a mistake</p>
                        <p className="text-neutral-200 text-sm leading-relaxed">{coaching.whyMistake}</p>
                    </div>
                )}
                {/* What to do */}
                <div>
                    <p className="text-emerald-500 text-xs font-medium mb-0.5">
                        {coaching.whyMistake ? "What to do instead" : "Why this is correct"}
                    </p>
                    <p className="text-neutral-200 text-sm leading-relaxed">{coaching.whatToDo}</p>
                </div>
                {/* Tip */}
                {coaching.tip && (
                    <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2">
                        <p className="text-sky-400 text-xs font-medium mb-0.5">Tip</p>
                        <p className="text-neutral-300 text-xs leading-relaxed">{coaching.tip}</p>
                    </div>
                )}
                {/* Board narrative */}
                <p className="text-neutral-500 text-xs italic leading-relaxed">{coaching.boardNarrative}</p>
            </div>

            {/* 4b. Concept teaching (collapsible) */}
            {CONCEPT_TEACHINGS[spot.concept] && (
                <details className="bg-neutral-900 rounded-lg border border-neutral-800">
                    <summary className="px-4 py-3 text-sm font-medium text-neutral-300 cursor-pointer hover:text-neutral-100">
                        About {CONCEPT_LABELS[spot.concept]}
                    </summary>
                    <div className="px-4 pb-3">
                        <p className="text-neutral-400 text-sm leading-relaxed">
                            {CONCEPT_TEACHINGS[spot.concept].explanation}
                        </p>
                    </div>
                </details>
            )}

            {/* 5. Context badges */}
            <div className="space-y-2">
                {/* Board texture & draw badges */}
                <div className="flex flex-wrap gap-1.5">
                    {optimalResult.boardTexture != null && (
                        <>
                            <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-xs">
                                {optimalResult.boardTexture.wetness}
                            </span>
                            {optimalResult.boardTexture.isMonotone && (
                                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">
                                    Monotone
                                </span>
                            )}
                            {optimalResult.boardTexture.isPaired && (
                                <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-xs">
                                    Paired
                                </span>
                            )}
                            {optimalResult.boardTexture.isRainbow && (
                                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-xs">
                                    Rainbow
                                </span>
                            )}
                        </>
                    )}
                    {optimalResult.draws != null && optimalResult.draws.totalOuts > 0 && (
                        <>
                            {optimalResult.draws.flushDraw && (
                                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-xs">
                                    Flush draw
                                </span>
                            )}
                            {optimalResult.draws.oesD && (
                                <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-400 text-xs">
                                    OESD
                                </span>
                            )}
                            {optimalResult.draws.gutshot && (
                                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs">
                                    Gutshot
                                </span>
                            )}
                            <span className="text-neutral-500 text-xs self-center">
                                {optimalResult.draws.totalOuts} outs ({(optimalResult.draws.drawEquity * 100).toFixed(1)}%)
                            </span>
                        </>
                    )}
                </div>

                {/* Equity / Pot Odds / SPR pills */}
                <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-xs font-medium">
                        Equity: {(optimalResult.equity * 100).toFixed(1)}%
                    </span>
                    <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-400 text-xs font-medium">
                        Pot Odds: {(optimalResult.potOdds * 100).toFixed(1)}%
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-medium">
                        SPR: {optimalResult.spr.toFixed(1)}
                    </span>
                </div>
            </div>

            {/* 6. Next Spot button */}
            <button
                onClick={nextSpot}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 px-4 rounded-lg font-bold text-base transition-colors min-h-[48px]"
            >
                {isLastSpot ? "View Summary" : "Next Spot"}
            </button>
        </div>
    );
}

// ── Helpers ─────────────────────────────────────────────────────────

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
