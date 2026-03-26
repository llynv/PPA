import type {
    CoachingContext,
    CoachingDepth,
    EnhancedCoaching,
    MistakeType,
    BoardTexture,
    DrawInfo,
    BettingRound,
    Recommendation,
    RecommendationReason,
    SessionDebrief,
    AnalysisData,
    DecisionResult,
} from "../types/poker";
import type { ConceptMastery, MasteryLevel, SessionSummary } from "../types/progress";
import type { DrillSpot, DrillResult, DrillConcept } from "../types/drill";
import { CONCEPT_LABELS } from "./concept-labels";
import { CURRICULUM } from "../data/curriculum";
import { isTierUnlocked } from "./learning-path";
import { MISTAKE_TO_DRILL_CONCEPT, MISTAKE_TYPE_LABELS } from "./mistake-mappings";
import { classifyMistake } from "./mistake-classifier";

// ── Coaching Depth ──────────────────────────────────────────────────

export function coachingDepthForMastery(
    level: MasteryLevel | undefined,
): CoachingDepth {
    if (level === undefined || level === "unseen" || level === "learning") {
        return "foundational";
    }
    if (level === "practiced" || level === "solid") {
        return "tactical";
    }
    return "nuanced";
}

// ── Board Narrative ─────────────────────────────────────────────────

export function generateBoardNarrative(
    boardTexture: BoardTexture,
    draws: DrawInfo,
    round: BettingRound,
): string {
    const parts: string[] = [];

    // Wetness
    parts.push(`This is a ${boardTexture.wetness} board`);

    // Suit pattern
    if (boardTexture.isMonotone) {
        parts[0] += " with a monotone texture";
    } else if (boardTexture.isTwoTone) {
        parts[0] += " with a two-tone texture";
    } else if (boardTexture.isRainbow) {
        parts[0] += " with a rainbow texture";
    }

    // Pairing
    if (boardTexture.isTrips) {
        parts.push("The board is trip-paired, reducing the number of strong made hands.");
    } else if (boardTexture.isPaired) {
        parts.push("The paired board changes hand rankings and reduces draw possibilities.");
    }

    // Connectedness
    if (boardTexture.connectedness >= 3) {
        parts.push("Highly connected cards create many straight possibilities.");
    }

    // Draws
    const drawParts: string[] = [];
    if (draws.flushDraw) {
        drawParts.push(`a flush draw (${draws.flushDrawOuts} outs)`);
    }
    if (draws.oesD) {
        drawParts.push("an open-ended straight draw");
    } else if (draws.gutshot) {
        drawParts.push("a gutshot straight draw");
    }
    if (draws.backdoorFlush && !draws.flushDraw) {
        drawParts.push("a backdoor flush draw");
    }
    if (draws.backdoorStraight && !draws.oesD && !draws.gutshot) {
        drawParts.push("a backdoor straight draw");
    }

    if (drawParts.length > 0) {
        parts.push(`You have ${drawParts.join(" and ")}.`);
    }

    // Round context
    if (round === "turn") {
        parts.push("With one card to come, draw equity is reduced.");
    } else if (round === "river") {
        parts.push("On the river, all draws have either completed or missed.");
    }

    return parts.join(". ") + (parts[parts.length - 1].endsWith(".") ? "" : ".");
}

// ── What-To-Do Templates ────────────────────────────────────────────

const WHAT_TO_DO_TEMPLATES: Record<MistakeType, Record<CoachingDepth, string>> = {
    OVERFOLD: {
        foundational: "When your equity ({equity}) exceeds pot odds ({potOdds}), calling or raising is profitable. Folding gives up the chance to win the pot.",
        tactical: "With {equity} equity vs {potOdds} pot odds, your range should continue here. Consider how your {action} frequency affects your overall folding range — overfolding makes you exploitable.",
        nuanced: "Solver folds here only {potOdds} of the time. With {equity} equity, this hand sits firmly in the continue range. Balance your folding range to avoid being exploited by aggressive opponents.",
    },
    OVERCALL: {
        foundational: "When your equity ({equity}) is below the pot odds ({potOdds}), calling loses money over time. Folding saves chips for better opportunities.",
        tactical: "At {equity} equity vs {potOdds} pot odds, this hand is a clear fold without strong implied odds. Reserve calls for hands that can improve significantly or that have the right price.",
        nuanced: "This spot requires {potOdds} equity to break even. At {equity}, even accounting for implied odds and board runout equity, the call is -EV. Mixed-strategy solvers fold this combo at high frequency.",
    },
    MISSED_VALUE_BET: {
        foundational: "With {equity} equity, your hand is strong enough to raise for value. Raising makes weaker hands pay to continue and grows the pot when you're ahead.",
        tactical: "At {equity} equity, you should raise for value. Your hand beats most of villain's calling range, and checking gives free cards that can outdraw you.",
        nuanced: "With {equity} equity, this is a clear value raise spot. The optimal sizing pressures villain's capped range while keeping in worse hands. Consider how your checking range looks in this spot — too many strong hands checked weakens your betting range.",
    },
    MISSED_CBET: {
        foundational: "As the preflop aggressor, you have a range advantage on most boards. Continuation betting applies pressure and can win the pot immediately, even without a strong hand.",
        tactical: "Your range advantage on this board texture supports a c-bet. By checking, you surrender initiative and let villain realize equity with marginal holdings.",
        nuanced: "On this board texture, solvers c-bet at a high frequency. Your specific hand benefits from betting — it has {equity} equity and the board favors your perceived range. Consider your bet sizing: smaller on dry boards, larger on wet boards.",
    },
    BAD_SIZING_OVER: {
        foundational: "Bet sizing matters. Betting too large risks more chips than necessary and can fold out the hands you want to call. Aim for a size relative to the pot.",
        tactical: "Your oversized bet polarizes your range unnecessarily. On this board texture, a smaller sizing achieves the same goal — denying equity or extracting value — without the extra risk.",
        nuanced: "Oversized bets in this spot only get called by hands that beat you and fold out hands you have beat. The optimal sizing balances your value and bluff ranges at a frequency that maximizes EV across your entire range.",
    },
    BAD_SIZING_UNDER: {
        foundational: "Betting too small gives opponents a cheap price to draw out. Size your bets to make opponents pay for their draws and mistakes.",
        tactical: "Your undersized bet gives villain correct odds to continue with draws. On a {boardTexture} board, sizing up denies equity and builds the pot when ahead.",
        nuanced: "The optimal sizing in this spot is larger to deny equity against villain's drawing range. Undersizing here lets villain profitably call with marginal draws and backdoor combinations, reducing your overall EV.",
    },
    CALLING_WITHOUT_ODDS: {
        foundational: "To call profitably, your equity must exceed the pot odds. With {equity} equity and {potOdds} pot odds, the math doesn't support calling. Fold and wait for a better spot.",
        tactical: "At {equity} equity vs {potOdds} required, this call is -EV. Without implied odds or strong draws to compensate, folding preserves your stack for profitable situations.",
        nuanced: "Even accounting for board runout and implied odds, {equity} equity doesn't justify the call at {potOdds}. Solver folds this combo here. Keeping this hand in your calling range bleeds EV over thousands of hands.",
    },
    BLUFF_WRONG_SPOT: {
        foundational: "Bluffing works best when opponents are likely to fold. In this spot with {equity} equity, your bluff has little fold equity and no backup plan when called.",
        tactical: "Effective bluffs need fold equity or draw equity as backup. With {equity} equity on this board, your hand doesn't qualify for either. Pick spots where your perceived range is strong.",
        nuanced: "This combo has insufficient equity and blockers for a bluff. Solvers choose bluff candidates that block villain's calling range or have backdoor draw equity. Your hand does neither in this spot.",
    },
    MISSED_DRAW_PLAY: {
        foundational: "With a strong draw, playing aggressively (semi-bluffing) gives you two ways to win: opponents fold immediately, or you hit your draw on a later street.",
        tactical: "Semi-bluffing with draws builds the pot for when you hit and generates fold equity. With your draw equity, {optimalAction} is better than passively hoping to hit.",
        nuanced: "Your draw equity combined with fold equity makes semi-bluffing +EV. Solvers play strong draws aggressively in this spot. Passive play reduces your overall EV by not leveraging fold equity and failing to build the pot.",
    },
    PASSIVE_WITH_EQUITY: {
        foundational: "With {equity} equity, your hand is strong enough to raise. Raising builds the pot when you're ahead and puts pressure on weaker hands to fold or pay more.",
        tactical: "At {equity} equity, checking or calling is too passive. Raising lets you build the pot for value and deny equity to drawing hands. Your hand plays better as an aggressive action.",
        nuanced: "With {equity} equity, the solver raises here at high frequency. Passive play lets villain realize equity cheaply and reduces your pot share. Consider the meta-impact: opponents learn to push you off pots when you don't raise strong hands.",
    },
};

// ── Why-Mistake Templates ───────────────────────────────────────────

const WHY_MISTAKE_TEMPLATES: Record<MistakeType, string> = {
    OVERFOLD: "With {equity} equity against {potOdds} pot odds, folding gives up a profitable spot. You had more than enough equity to continue.",
    OVERCALL: "With only {equity} equity facing {potOdds} pot odds, calling here loses money over time. The pot isn't offering enough to justify continuing.",
    MISSED_VALUE_BET: "With {equity} equity, your hand is strong enough to raise for value. Just calling misses the chance to extract chips from weaker hands.",
    MISSED_CBET: "As the preflop aggressor, checking forfeits your range advantage. A continuation bet applies pressure and can take down the pot immediately.",
    BAD_SIZING_OVER: "Your bet was significantly larger than optimal. Oversizing risks too many chips and folds out hands you want to get value from.",
    BAD_SIZING_UNDER: "Your bet was too small, giving opponents a cheap price to draw out. Undersizing fails to deny equity and doesn't build the pot enough.",
    CALLING_WITHOUT_ODDS: "With {equity} equity and {potOdds} pot odds, the math doesn't support calling. Without meaningful draws or implied odds, this call bleeds chips.",
    BLUFF_WRONG_SPOT: "With only {equity} equity and no draws, raising here has very little fold equity and no backup plan when called.",
    MISSED_DRAW_PLAY: "With a strong draw, playing passively misses the chance to semi-bluff. Aggressive play with draws wins the pot immediately or builds it for when you hit.",
    PASSIVE_WITH_EQUITY: "With {equity} equity, just calling is too passive. Your hand is strong enough to raise, which builds the pot and pressures weaker holdings.",
};

// ── Template Interpolation ──────────────────────────────────────────

function interpolateTemplate(
    template: string,
    ctx: CoachingContext,
): string {
    const equity = ctx.decision.equity != null
        ? `${Math.round(ctx.decision.equity * 100)}%`
        : "unknown";
    const potOdds = ctx.decision.potOdds != null
        ? `${Math.round(ctx.decision.potOdds * 100)}%`
        : "unknown";
    const action = ctx.decision.heroAction;
    const optimalAction = ctx.decision.optimalAction;
    const boardTexture = ctx.boardTexture.wetness;

    return template
        .replace(/\{equity\}/g, equity)
        .replace(/\{potOdds\}/g, potOdds)
        .replace(/\{action\}/g, action)
        .replace(/\{optimalAction\}/g, optimalAction)
        .replace(/\{boardTexture\}/g, boardTexture);
}

// ── Action Label Formatting ─────────────────────────────────────────

function formatActionLabel(action: string, amount?: number, isAllIn?: boolean): string {
    if (isAllIn && (action === "bet" || action === "raise" || action === "call")) {
        return amount != null && amount > 0 ? `All-in $${amount}` : "All-in";
    }
    const label = action.charAt(0).toUpperCase() + action.slice(1);
    if (amount != null && amount > 0) return `${label} $${amount}`;
    return label;
}

// ── Generate Enhanced Coaching (Mistake) ────────────────────────────

export function generateEnhancedCoaching(ctx: CoachingContext): EnhancedCoaching {
    if (!ctx.mistakeType) {
        throw new Error("generateEnhancedCoaching requires a non-null mistakeType — use generateCorrectPlayCoaching for correct plays");
    }
    const mistakeType = ctx.mistakeType;
    const depth = coachingDepthForMastery(ctx.mastery?.level);

    // whatHappened
    const heroLabel = formatActionLabel(
        ctx.decision.heroAction,
        ctx.decision.heroAmount,
        ctx.decision.heroIsAllIn,
    );
    const whatHappened = `You chose to ${heroLabel.toLowerCase()} on the ${ctx.round}.`;

    // whyMistake
    const whyMistake = interpolateTemplate(WHY_MISTAKE_TEMPLATES[mistakeType], ctx);

    // whatToDo (depth-adaptive)
    const whatToDo = interpolateTemplate(WHAT_TO_DO_TEMPLATES[mistakeType][depth], ctx);

    // boardNarrative
    const boardNarrative = generateBoardNarrative(ctx.boardTexture, ctx.draws, ctx.round);

    // tip (mastery-aware)
    let tip: string | null = null;
    if (ctx.mastery) {
        if (ctx.mastery.level === "learning") {
            tip = `You've seen this concept ${ctx.mastery.totalAttempts} times. Focus on the basic pattern first.`;
        } else if (ctx.mastery.level === "practiced") {
            tip = `Your accuracy on this concept is ${Math.round(ctx.mastery.accuracy * 100)}%. Keep working on consistency.`;
        } else if (ctx.mastery.level === "solid" || ctx.mastery.level === "mastered") {
            tip = `You usually get this right (${Math.round(ctx.mastery.accuracy * 100)}% accuracy). This might be a tricky edge case.`;
        }
    }

    return {
        whatHappened,
        whyMistake,
        whatToDo,
        tip,
        boardNarrative,
        concept: mistakeType,
    };
}

// ── Generate Correct Play Coaching ──────────────────────────────────

export function generateCorrectPlayCoaching(ctx: CoachingContext): EnhancedCoaching {
    const heroLabel = formatActionLabel(
        ctx.decision.heroAction,
        ctx.decision.heroAmount,
        ctx.decision.heroIsAllIn,
    );
    const equityPct = ctx.decision.equity != null
        ? `${Math.round(ctx.decision.equity * 100)}%`
        : "good";

    const whatHappened = `You correctly chose to ${heroLabel.toLowerCase()} on the ${ctx.round}.`;

    const whatToDo = `Nice play. With ${equityPct} equity, ${ctx.decision.heroAction} is the optimal action here. Keep recognizing these spots.`;

    const boardNarrative = generateBoardNarrative(ctx.boardTexture, ctx.draws, ctx.round);

    return {
        whatHappened,
        whyMistake: null,
        whatToDo,
        tip: null,
        boardNarrative,
        concept: null,
    };
}

// ── Generate Drill Coaching ─────────────────────────────────────────

export function generateDrillCoaching(
    spot: DrillSpot,
    result: DrillResult,
    mastery: ConceptMastery | undefined,
    optimalResult: DecisionResult,
): EnhancedCoaching {
    const ctx: CoachingContext = {
        decision: {
            round: spot.category === "preflop" ? "preflop" : spot.category,
            heroAction: result.heroAction,
            optimalAction: optimalResult.optimalAction,
            optimalFrequencies: optimalResult.frequencies,
            evDiff: Math.abs(result.evDelta),
            equity: optimalResult.equity,
            potOdds: optimalResult.potOdds,
            draws: optimalResult.draws,
            boardTexture: optimalResult.boardTexture,
        },
        mistakeType: result.isCorrect ? null : classifyMistake({
            round: spot.category === "preflop" ? "preflop" : spot.category,
            heroAction: result.heroAction,
            optimalAction: optimalResult.optimalAction,
            optimalFrequencies: optimalResult.frequencies,
            evDiff: Math.abs(result.evDelta),
            equity: optimalResult.equity,
            potOdds: optimalResult.potOdds,
            draws: optimalResult.draws,
            boardTexture: optimalResult.boardTexture,
        }).type,
        mastery,
        boardTexture: optimalResult.boardTexture,
        draws: optimalResult.draws,
        round: spot.category === "preflop" ? "preflop" : spot.category,
    };

    if (result.isCorrect) {
        return generateCorrectPlayCoaching(ctx);
    }

    return generateEnhancedCoaching(ctx);
}

// ── Get Recommendation ──────────────────────────────────────────────

export function getRecommendation(
    mastery: Record<string, ConceptMastery>,
): Recommendation {
    // Step 1: Learning concepts — weakest recentAccuracy (prioritize fixing weaknesses)
    const learningConcepts: { concept: DrillConcept; recentAccuracy: number }[] = [];
    for (const tier of CURRICULUM) {
        for (const concept of tier.concepts) {
            const m = mastery[concept];
            if (m && m.level === "learning") {
                learningConcepts.push({ concept, recentAccuracy: m.recentAccuracy });
            }
        }
    }
    if (learningConcepts.length > 0) {
        learningConcepts.sort((a, b) => a.recentAccuracy - b.recentAccuracy);
        return buildRecommendation(learningConcepts[0].concept, "struggling");
    }

    // Step 2: First unseen concept in an unlocked tier
    for (const tier of CURRICULUM) {
        if (!isTierUnlocked(tier, mastery)) continue;
        for (const concept of tier.concepts) {
            if (!mastery[concept]) {
                return buildRecommendation(concept as DrillConcept, "unseen");
            }
        }
    }

    // Step 3: Practiced concepts — weakest recentAccuracy
    const practicedConcepts: { concept: DrillConcept; recentAccuracy: number }[] = [];
    for (const tier of CURRICULUM) {
        for (const concept of tier.concepts) {
            const m = mastery[concept];
            if (m && m.level === "practiced") {
                practicedConcepts.push({ concept, recentAccuracy: m.recentAccuracy });
            }
        }
    }
    if (practicedConcepts.length > 0) {
        practicedConcepts.sort((a, b) => a.recentAccuracy - b.recentAccuracy);
        return buildRecommendation(practicedConcepts[0].concept, "reinforce");
    }

    // Step 4: Solid concepts — stalest by lastAttemptAt
    const solidConcepts: { concept: DrillConcept; lastAttemptAt: number }[] = [];
    for (const tier of CURRICULUM) {
        for (const concept of tier.concepts) {
            const m = mastery[concept];
            if (m && m.level === "solid") {
                solidConcepts.push({ concept, lastAttemptAt: m.lastAttemptAt });
            }
        }
    }
    if (solidConcepts.length > 0) {
        solidConcepts.sort((a, b) => a.lastAttemptAt - b.lastAttemptAt);
        return buildRecommendation(solidConcepts[0].concept, "stale");
    }

    // Step 5: First unseen in locked tiers
    for (const tier of CURRICULUM) {
        if (isTierUnlocked(tier, mastery)) continue;
        for (const concept of tier.concepts) {
            if (!mastery[concept]) {
                return buildRecommendation(concept as DrillConcept, "advance");
            }
        }
    }

    // Step 6: All mastered
    return {
        concept: null,
        reason: "complete",
        narrative: "You've mastered all concepts. Keep practicing to maintain your edge, or revisit earlier concepts for reinforcement.",
    };
}

function buildRecommendation(
    concept: DrillConcept,
    reason: Exclude<RecommendationReason, "complete">,
): Recommendation {
    const label = CONCEPT_LABELS[concept] ?? concept;

    const narratives: Record<Exclude<RecommendationReason, "complete">, string> = {
        unseen: `Time to learn ${label}. This is a new concept you haven't practiced yet.`,
        struggling: `Let's work on ${label}. Your recent accuracy shows this needs more practice.`,
        reinforce: `Reinforce your ${label} skills. Consistent practice turns knowledge into instinct.`,
        stale: `Time to revisit ${label}. It's been a while since you practiced this concept.`,
        advance: `Ready to advance to ${label}. Push into new territory to expand your game.`,
    };

    return {
        concept,
        reason,
        narrative: narratives[reason],
    };
}

// ── Session Debrief ─────────────────────────────────────────────────

export function generateSessionDebrief(
    currentAnalysis: AnalysisData,
    _recentSessions: SessionSummary[],
    _mastery: Record<string, ConceptMastery>,
): SessionDebrief {
    const { heroGrade, mistakes, totalEvLoss } = currentAnalysis;
    const details: string[] = [];
    let suggestedDrill: DrillConcept | null = null;

    // Headline
    let headline: string;
    if (mistakes.length === 0) {
        headline = `Great session! You earned an ${heroGrade} with no mistakes.`;
    } else {
        headline = `You earned a ${heroGrade} with ${mistakes.length} mistake${mistakes.length === 1 ? "" : "s"} costing ${totalEvLoss.toFixed(1)} BB.`;
    }

    // Details
    if (mistakes.length > 0) {
        // Group mistakes by type
        const byType: Record<string, { count: number; totalEvLoss: number }> = {};
        for (const mistake of mistakes) {
            const type = mistake.type ?? "UNKNOWN";
            if (!byType[type]) {
                byType[type] = { count: 0, totalEvLoss: 0 };
            }
            byType[type].count++;
            byType[type].totalEvLoss += mistake.evLoss;
        }

        // Sort by total EV loss descending
        const sorted = Object.entries(byType).sort(
            (a, b) => b[1].totalEvLoss - a[1].totalEvLoss,
        );

        for (const [type, data] of sorted) {
            const label = MISTAKE_TYPE_LABELS[type as MistakeType] ?? type;
            details.push(
                `${label}: ${data.count} occurrence${data.count === 1 ? "" : "s"} (${data.totalEvLoss.toFixed(1)} BB lost)`,
            );
        }

        // Suggested drill — based on worst mistake type
        const worstType = sorted[0][0] as MistakeType;
        if (MISTAKE_TO_DRILL_CONCEPT[worstType]) {
            suggestedDrill = MISTAKE_TO_DRILL_CONCEPT[worstType];
        }
    }

    return {
        headline,
        details,
        suggestedDrill,
    };
}

