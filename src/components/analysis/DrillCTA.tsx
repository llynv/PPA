import { useNavigate } from "react-router-dom";
import type { MistakeType } from "../../types/poker";
import type { DrillConcept } from "../../types/drill";

/** Maps MistakeType to the most relevant DrillConcept to practice */
const MISTAKE_TO_DRILL: Record<MistakeType, DrillConcept> = {
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

const MISTAKE_LABELS: Record<MistakeType, string> = {
    OVERFOLD: "Folding too often",
    OVERCALL: "Calling too wide",
    MISSED_VALUE_BET: "Missing value bets",
    MISSED_CBET: "Missing c-bets",
    BAD_SIZING_OVER: "Bet sizing (too large)",
    BAD_SIZING_UNDER: "Bet sizing (too small)",
    CALLING_WITHOUT_ODDS: "Calling without odds",
    BLUFF_WRONG_SPOT: "Bluffing in bad spots",
    MISSED_DRAW_PLAY: "Playing draws passively",
    PASSIVE_WITH_EQUITY: "Playing too passively",
};

interface DrillCTAProps {
    mistakeType: MistakeType;
}

export function DrillCTA({ mistakeType }: DrillCTAProps) {
    const navigate = useNavigate();
    const concept = MISTAKE_TO_DRILL[mistakeType];

    const handleClick = () => {
        navigate(`/practice/drills?concept=${concept}`);
    };

    return (
        <button
            onClick={handleClick}
            className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 text-xs font-medium hover:bg-emerald-600/30 transition-colors"
        >
            <span>Practice: {MISTAKE_LABELS[mistakeType]}</span>
            <span aria-hidden="true">&rarr;</span>
        </button>
    );
}
