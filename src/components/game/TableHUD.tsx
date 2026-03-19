import { useGameStore } from "../../store/gameStore";

export function TableHUD() {
    const players = useGameStore((s) => s.players);
    const pot = useGameStore((s) => s.pot);
    const currentRound = useGameStore((s) => s.currentRound);
    const activePlayerIndex = useGameStore((s) => s.activePlayerIndex);

    const heroPlayer = players.find((p) => p.isHero);
    const activePlayer = players[activePlayerIndex];
    const isHeroTurn = activePlayer?.isHero === true;

    if (!heroPlayer) return null;

    // Current highest bet on the table
    const currentMaxBet = Math.max(0, ...players.map((p) => p.currentBet));
    const callAmount = currentMaxBet - (heroPlayer.currentBet ?? 0);
    const heroFacingBet = isHeroTurn && callAmount > 0;

    // Pot odds: ratio of call amount to (pot + call amount)
    const potOddsRatio =
        heroFacingBet && callAmount > 0
            ? (pot + callAmount) / callAmount
            : null;
    const potOddsPct =
        heroFacingBet && callAmount > 0
            ? Math.round((callAmount / (pot + callAmount)) * 100)
            : null;

    // SPR: Stack-to-Pot Ratio (hero effective stack / pot), visible from flop onward
    const showSPR = currentRound !== "preflop" && pot > 0;
    const spr = showSPR ? heroPlayer.stack / pot : null;

    const hasBadges = potOddsRatio != null || spr != null;
    if (!hasBadges) return null;

    return (
        <div className="relative z-20 flex items-center justify-center gap-2 flex-wrap">
            {potOddsRatio != null && potOddsPct != null && (
                <span
                    aria-label={`Pot odds: ${potOddsRatio.toFixed(1)} to 1, ${potOddsPct}%`}
                    className="bg-slate-700/80 text-slate-200 text-[10px] md:text-xs px-2 py-0.5 rounded-full font-medium"
                >
                    Odds: {potOddsRatio.toFixed(1)}:1 ({potOddsPct}%)
                </span>
            )}
            {spr != null && (
                <span
                    aria-label={`Stack to pot ratio: ${spr.toFixed(1)}`}
                    className="bg-slate-700/80 text-slate-200 text-[10px] md:text-xs px-2 py-0.5 rounded-full font-medium"
                >
                    SPR: {spr.toFixed(1)}
                </span>
            )}
        </div>
    );
}
