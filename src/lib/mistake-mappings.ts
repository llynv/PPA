import type { MistakeType } from "../types/poker";
import type { DrillConcept } from "../types/drill";

/** Maps each MistakeType to the most relevant DrillConcept for practice */
export const MISTAKE_TO_DRILL_CONCEPT: Record<MistakeType, DrillConcept> = {
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

/** Human-readable labels for each MistakeType */
export const MISTAKE_TYPE_LABELS: Record<MistakeType, string> = {
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
