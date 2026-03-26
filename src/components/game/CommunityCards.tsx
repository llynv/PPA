import type { Card, BettingRound } from "../../types/poker";
import { PlayingCard } from "./PlayingCard";

// ── Round Labels ────────────────────────────────────────────────────

const ROUND_LABELS: Record<BettingRound, string> = {
    preflop: "Preflop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
};

// ── Empty Card Slot ─────────────────────────────────────────────────

function EmptyCardSlot() {
    return (
        <div
            aria-label="Empty card slot"
            className="w-8 h-12 sm:w-10 sm:h-14 md:w-12 md:h-16 rounded-md border border-dashed border-white/10 flex items-center justify-center"
        >
            <span className="text-white/20 text-xs">?</span>
        </div>
    );
}

// ── Component ───────────────────────────────────────────────────────

interface CommunityCardsProps {
    cards: Card[];
    round: BettingRound;
}

export function CommunityCards({ cards, round }: CommunityCardsProps) {
    const totalSlots = 5;
    const emptySlots = totalSlots - cards.length;

    return (
        <div className="relative z-20 flex flex-col items-center gap-1">
            <span className="text-white/40 text-[10px] md:text-xs font-medium uppercase tracking-widest">
                {ROUND_LABELS[round]}
            </span>
            <div className="flex justify-center items-center gap-0.5 md:gap-1.5">
                {cards.map((card, i) => (
                    <PlayingCard key={i} card={card} />
                ))}
                {Array.from({ length: emptySlots }, (_, i) => (
                    <EmptyCardSlot key={`empty-${i}`} />
                ))}
            </div>
        </div>
    );
}
