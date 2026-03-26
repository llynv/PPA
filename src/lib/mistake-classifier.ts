import type {
    ActionType,
    Decision,
    MistakeCategory,
    MistakeType,
} from "../types/poker";

// ── Action Mapping ──────────────────────────────────────────────────

/**
 * Map an ActionType to its frequency category.
 */
export function mapActionToCategory(action: ActionType): "fold" | "call" | "raise" {
    switch (action) {
        case "fold":
            return "fold";
        case "check":
        case "call":
            return "call";
        case "bet":
        case "raise":
            return "raise";
    }
}

// ── Mistake Classification ──────────────────────────────────────────

const MISTAKE_CATEGORY_MAP: Record<MistakeType, MistakeCategory> = {
    OVERFOLD: "FREQUENCY",
    OVERCALL: "FREQUENCY",
    PASSIVE_WITH_EQUITY: "FREQUENCY",
    BAD_SIZING_OVER: "SIZING",
    BAD_SIZING_UNDER: "SIZING",
    MISSED_VALUE_BET: "AGGRESSION",
    MISSED_CBET: "AGGRESSION",
    BLUFF_WRONG_SPOT: "AGGRESSION",
    CALLING_WITHOUT_ODDS: "EQUITY_REALIZATION",
    MISSED_DRAW_PLAY: "EQUITY_REALIZATION",
};

// ── Classification Thresholds ───────────────────────────────────────

const SIZING_OVER_THRESHOLD = 0.5;
const SIZING_UNDER_THRESHOLD = -0.4;
const MIN_DRAW_OUTS_SEMI_BLUFF = 8;
const MIN_OUTS_DRAW_VALUE = 4;
const STRONG_EQUITY_THRESHOLD = 0.60;
const LOW_EQUITY_THRESHOLD = 0.30;

// Note: MISSED_CBET classification requires preflop aggressor context
// not available in the current Decision interface. Will be added when
// preflop history tracking is implemented.

export function classifyMistake(
    decision: Decision,
): { type: MistakeType; category: MistakeCategory } {
    const type = classifyMistakeType(decision);
    return { type, category: MISTAKE_CATEGORY_MAP[type] };
}

function classifyMistakeType(decision: Decision): MistakeType {
    const hero = mapActionToCategory(decision.heroAction);
    const optimal = mapActionToCategory(decision.optimalAction);
    const equity = decision.equity ?? 0;
    const potOdds = decision.potOdds ?? 0;
    const draws = decision.draws;
    const sizing = decision.betSizeAnalysis;

    // 1. Sizing mistakes (same action type, wrong amount)
    if (hero === optimal && sizing) {
        if (sizing.sizingError > SIZING_OVER_THRESHOLD) {
            return "BAD_SIZING_OVER";
        }
        if (sizing.sizingError < SIZING_UNDER_THRESHOLD) {
            return "BAD_SIZING_UNDER";
        }
    }

    // 2. Hero folded, but should have continued
    if (hero === "fold") {
        // Check for missed draw play first
        if (draws && draws.totalOuts >= MIN_DRAW_OUTS_SEMI_BLUFF && optimal === "raise") {
            return "MISSED_DRAW_PLAY";
        }
        return "OVERFOLD";
    }

    // 3. Hero called, but should have folded
    if (hero === "call" && optimal === "fold") {
        // More specific: calling without odds
        if (equity < potOdds && (!draws || draws.totalOuts < MIN_OUTS_DRAW_VALUE)) {
            return "CALLING_WITHOUT_ODDS";
        }
        return "OVERCALL";
    }

    // 4. Hero called, but should have raised
    if (hero === "call" && optimal === "raise") {
        if (equity >= STRONG_EQUITY_THRESHOLD) {
            return "MISSED_VALUE_BET";
        }
        return "PASSIVE_WITH_EQUITY";
    }

    // 5. Hero raised, but should have folded
    if (hero === "raise" && optimal === "fold") {
        return "BLUFF_WRONG_SPOT";
    }

    // 6. Hero raised, but should have called (overaggression)
    if (hero === "raise" && optimal === "call") {
        if (equity < LOW_EQUITY_THRESHOLD && (!draws || draws.totalOuts < MIN_OUTS_DRAW_VALUE)) {
            return "BLUFF_WRONG_SPOT";
        }
        return "MISSED_VALUE_BET";
    }

    // Fallback — should not be reached if called correctly
    return "OVERFOLD";
}
