import { useGameStore } from "../../store/gameStore";

interface WinnerBannerProps {
    handNumber: number;
}

export function WinnerBanner({ handNumber }: WinnerBannerProps) {
    const handHistory = useGameStore((s) => s.handHistory);

    const hand = handHistory.find((h) => h.handNumber === handNumber);
    if (!hand) return null;

    const winnerPlayer = hand.players.find((p) => p.id === hand.winnerId);
    if (!winnerPlayer) return null;

    const isHeroWin = winnerPlayer.isHero;
    const winnerName = winnerPlayer.isHero ? "You" : winnerPlayer.name;
    const handDesc = hand.winnerHand ?? "unknown hand";

    return (
        <div
            className={`text-center text-sm font-medium rounded-lg px-3 py-2 ${
                isHeroWin
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-slate-700/50 text-slate-400 border border-slate-700"
            }`}
        >
            {isHeroWin
                ? `You won with ${handDesc}`
                : `${winnerName} won with ${handDesc}`}
        </div>
    );
}
