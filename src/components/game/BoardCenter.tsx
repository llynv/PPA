import type { BettingRound } from "../../types/poker";
import { useGameStore } from "../../store/gameStore";
import { CommunityCards } from "./CommunityCards";
import { ActivityRibbon } from "./ActivityRibbon";

const ROUND_LABELS: Record<BettingRound, string> = {
    preflop: "Preflop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
};

export function BoardCenter() {
    const pot = useGameStore((s) => s.pot);
    const communityCards = useGameStore((s) => s.communityCards);
    const currentRound = useGameStore((s) => s.currentRound);

    return (
        <div className="flex flex-col items-center gap-1.5">
            {/* Pot display */}
            <div
                className="font-medium text-sm"
                style={{
                    fontFamily: "var(--sd-font-mono)",
                    color: "var(--sd-brass)",
                }}
            >
                Pot: {pot.toFixed(2)}
            </div>

            {/* Community cards */}
            <CommunityCards cards={communityCards} round={currentRound} />

            {/* Street label — below cards per spec */}
            <span
                data-testid="board-street-label"
                className="text-[10px] md:text-xs font-medium uppercase tracking-widest"
                style={{ color: "var(--sd-ivory)", opacity: 0.4 }}
            >
                {ROUND_LABELS[currentRound]}
            </span>

            {/* Activity ribbon — AI action feedback */}
            <ActivityRibbon />
        </div>
    );
}
