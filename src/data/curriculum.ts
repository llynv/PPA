import type { CurriculumTier } from "../types/curriculum";

export const CURRICULUM: CurriculumTier[] = [
    {
        id: 1,
        name: "Foundations",
        description: "Preflop basics — ranges, position, and stealing.",
        concepts: ["open_raise", "cold_call", "steal"],
        unlockRequirement: null,
    },
    {
        id: 2,
        name: "Aggression",
        description: "Taking initiative with c-bets, 3-bets, and squeezes.",
        concepts: ["cbet_value", "cbet_bluff", "three_bet", "squeeze"],
        unlockRequirement: { tier: 1, minConceptsPracticed: 2 },
    },
    {
        id: 3,
        name: "Defense",
        description: "Responding to aggression and controlling pot size.",
        concepts: ["check_call", "check_raise", "float", "probe", "pot_control", "bluff_catch"],
        unlockRequirement: { tier: 2, minConceptsPracticed: 2 },
    },
    {
        id: 4,
        name: "Advanced",
        description: "Multi-street planning, thin value, and river play.",
        concepts: ["barrel", "semi_bluff", "value_bet_thin", "river_bluff", "river_raise"],
        unlockRequirement: { tier: 3, minConceptsPracticed: 3 },
    },
];
