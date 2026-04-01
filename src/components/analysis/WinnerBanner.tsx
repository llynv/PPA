import { useGameStore } from "../../store/gameStore";

interface WinnerBannerProps {
    handNumber: number;
}

export function WinnerBanner({ handNumber }: WinnerBannerProps) {
    const handHistory = useGameStore((s) => s.handHistory);

    const hand = handHistory.find((h) => h.handNumber === handNumber);
    if (!hand) return null;

    const winnerIds = hand.winnerIds ?? [hand.winnerId];
    const isSplitPot = winnerIds.length > 1;

    // Detect fold win: if only one non-folded player, it was a fold win
    const nonFoldedPlayers = hand.players.filter((p) => !p.isFolded);
    const isFoldWin = nonFoldedPlayers.length <= 1;
    const handDesc = isFoldWin ? null : (hand.winnerHand ?? "unknown hand");

    // Build display text
    let displayText: string;
    let isHeroWin: boolean;

    if (isSplitPot) {
        const winnerNames = winnerIds.map((id) => {
            const p = hand.players.find((pl) => pl.id === id);
            return p?.isHero ? "You" : (p?.name ?? "Unknown");
        });
        isHeroWin = winnerIds.some((id) => hand.players.find((p) => p.id === id)?.isHero);
        displayText = handDesc
            ? `Split pot \u2014 ${winnerNames.join(" and ")} chop with ${handDesc}`
            : `Split pot \u2014 ${winnerNames.join(" and ")} chop`;
    } else {
        const winnerPlayer = hand.players.find((p) => p.id === winnerIds[0]);
        isHeroWin = winnerPlayer?.isHero ?? false;
        const winnerName = winnerPlayer?.isHero ? "You" : (winnerPlayer?.name ?? "Unknown");

        if (isFoldWin) {
            displayText = isHeroWin ? "You won the pot" : `${winnerName} won the pot`;
        } else {
            displayText = isHeroWin
                ? `You won with ${handDesc}`
                : `${winnerName} won with ${handDesc}`;
        }
    }

    return (
        <div
            className={`text-center text-sm font-medium rounded-lg px-3 py-2 ${
                isHeroWin
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-slate-700/50 text-slate-400 border border-slate-700"
            }`}
        >
            {displayText}
        </div>
    );
}
