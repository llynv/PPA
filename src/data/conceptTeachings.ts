import type { ConceptTeaching } from "../types/poker";
import type { DrillConcept } from "../types/drill";

export const CONCEPT_TEACHINGS: Record<DrillConcept, ConceptTeaching> = {
    open_raise: {
        summary: "Opening raises establish initiative — GTO ranges widen as position improves.",
        explanation: "An open raise is the first voluntary bet preflop. Position determines how wide you can profitably open — from tight UTG ranges (top 12-15%) to wide BTN ranges (40-50%). Opening establishes the betting lead, which gives you the option to continuation bet on later streets.",
    },
    cold_call: {
        summary: "Cold calling requires strong hands because you face multiple opponents without initiative.",
        explanation: "A cold call means calling an open raise without having money already invested. You need a tighter range than the opener because you lack initiative and may face a squeeze behind you. Focus on hands with good playability postflop — suited connectors, pocket pairs, and suited broadways.",
    },
    steal: {
        summary: "Blind stealing exploits fold equity from late position with a wide range.",
        explanation: "Stealing the blinds from late position (CO/BTN) is a core GTO strategy. When folded to you in late position, the blinds fold often enough to make raises profitable even with weak holdings. The key is balancing your steal range so opponents can't easily exploit you by 3-betting light.",
    },
    cbet_value: {
        summary: "Value c-bets leverage your preflop aggression on boards favoring your range.",
        explanation: "A value continuation bet is made when you have a strong hand on a board that favors your preflop range. As the preflop aggressor, you typically have more overpairs, top pairs, and sets than the caller. Bet sizing should match the board texture — smaller on dry boards, larger on wet boards where you need to deny equity.",
    },
    cbet_bluff: {
        summary: "Bluff c-bets use board coverage and blockers to deny equity cheaply.",
        explanation: "Bluff c-bets take advantage of your range advantage as the preflop raiser. On boards that favor your range (ace-high, king-high, dry), you can bet small with a high frequency. Choose bluff candidates that have backdoor equity (backdoor flush/straight draws) so you have fallback outs when called.",
    },
    three_bet: {
        summary: "3-betting for value and as bluffs narrows the field and builds pots with strong ranges.",
        explanation: "A 3-bet re-raises the original opener. GTO 3-bet ranges include value hands (AA, KK, QQ, AKs) and bluffs (suited aces, suited connectors). 3-betting from the blinds is especially important as it compensates for your positional disadvantage. Size your 3-bets larger out of position (4x) than in position (3x).",
    },
    squeeze: {
        summary: "Squeezing exploits dead money when facing an open and one or more callers.",
        explanation: "A squeeze play is a 3-bet made after someone opens and one or more players cold call. The dead money from the callers makes squeezing more profitable than a standard 3-bet. The original caller's range is usually capped (they would have 3-bet with their strongest hands), making them likely to fold. Size larger than a standard 3-bet — typically 4x the open plus 1x per caller.",
    },
    check_call: {
        summary: "Check-calling defends your range at the correct frequency against aggression.",
        explanation: "Check-calling is how you defend against bets without raising. GTO requires defending enough to prevent opponents from profitably bluffing any two cards. Against a pot-sized bet, you need to defend roughly 50% of your range. Choose calling hands that have decent equity and showdown value but aren't strong enough to raise.",
    },
    check_raise: {
        summary: "Check-raising as a semi-bluff or for value traps aggressive opponents.",
        explanation: "Check-raising is the strongest play from out of position — it builds the pot with your best hands and adds fold equity to your semi-bluffs. GTO check-raise ranges are polarized: very strong hands (sets, two pair) for value, and draws (flush draws, straight draws) as bluffs. On wet boards, check-raise more frequently to deny equity.",
    },
    float: {
        summary: "Floating in position takes pots away when the aggressor gives up on later streets.",
        explanation: "A float is calling a bet in position with a marginal hand, planning to take the pot when your opponent checks on a later street. This works because many c-bettors give up on the turn when called. Good float candidates are hands with backdoor equity or overcards that can improve. Only float when you have position — it's unprofitable out of position.",
    },
    probe: {
        summary: "Probe betting exploits a missed c-bet to take initiative on the turn.",
        explanation: "A probe bet is a bet made out of position when the preflop aggressor checks back the flop. This check signals weakness — they likely don't have an overpair or top pair. Probe with a wide range including middle pairs, draws, and bluffs. Size small (25-33% pot) since you're mostly denying equity and taking the initiative rather than building a huge pot.",
    },
    pot_control: {
        summary: "Pot control keeps the pot small with medium-strength hands to avoid costly mistakes.",
        explanation: "Pot control means checking or calling instead of betting with medium-strength hands. With one pair on a wet board, you often want to keep the pot manageable rather than inflate it against a range that's either beating you or drawing to beat you. Check back on the turn with showdown-value hands, then decide on the river based on opponent's action.",
    },
    bluff_catch: {
        summary: "Bluff-catching identifies spots where your hand beats bluffs but loses to value.",
        explanation: "Bluff catching is calling with a hand that only beats bluffs — you lose to any value bet but win against bluff attempts. The key is estimating the opponent's bluff frequency. If they bluff more than your pot odds require, calling is profitable. Good bluff-catchers are hands near the bottom of your calling range that block value hands.",
    },
    barrel: {
        summary: "Multi-street barreling applies maximum pressure with coordinated value and bluff ranges.",
        explanation: "Barreling means betting multiple streets in a row. GTO barreling requires a balanced range of value bets and bluffs on each street. As you bet more streets, your range should become more polarized. Choose turn and river bluffs that have blockers to your opponent's calling range or that picked up equity. Natural bluff-to-value ratio decreases on each street.",
    },
    semi_bluff: {
        summary: "Semi-bluffing combines fold equity with draw equity for a +EV aggressive play.",
        explanation: "A semi-bluff is a bet or raise with a drawing hand that can improve to the best hand. You profit two ways: opponents fold immediately (fold equity) or you hit your draw (hand equity). Semi-bluff with draws that have 8+ outs — flush draws, open-ended straight draws, or combo draws. The combined equity from fold equity plus draw equity makes these plays significantly +EV.",
    },
    value_bet_thin: {
        summary: "Thin value betting extracts chips from worse hands that might fold to larger bets.",
        explanation: "Thin value betting means betting with a hand that beats a narrow range of calling hands. The sizing must be small enough that worse hands still call. Typical thin value spots include top pair with a weak kicker on the river, or second pair on a dry board. The key question is: 'Can any worse hand call?' If yes, bet small.",
    },
    river_bluff: {
        summary: "River bluffs target the right frequency with hands that have no showdown value.",
        explanation: "River bluffs are bets on the final street with hands that can't win at showdown. GTO bluff frequency depends on your bet sizing — with a pot-sized bet, you should bluff about 33% of the time (1 bluff for every 2 value bets). Choose bluff candidates that block your opponent's calling range and that turned equity draws that missed.",
    },
    river_raise: {
        summary: "River raises for value polarize your range — only raise with the nuts or as a bluff.",
        explanation: "Raising on the river is the most polarized play in poker. You should only raise with the very best hands (nut flushes, full houses, straights) or as a bluff. Medium-strength hands should call or fold, never raise. When raising as a bluff, use hands that block the nuts and have zero showdown value.",
    },
};
