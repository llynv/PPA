import type { Card, BettingRound } from "../../types/poker";
import { suitSymbol, suitColor } from "../../lib/deck";

// ── Round Labels ────────────────────────────────────────────────────

const ROUND_LABELS: Record<BettingRound, string> = {
    preflop: "Preflop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
    showdown: "Showdown",
};

// ── Card Display (community size) ───────────────────────────────────

function CommunityCardDisplay({ card }: { card: Card }) {
    const color =
        suitColor(card.suit) === "red" ? "text-red-500" : "text-slate-800";

    return (
        <div
            aria-label={`${card.rank} of ${card.suit}`}
            className={`w-10 h-14 md:w-14 md:h-20 bg-white rounded-lg border border-slate-300 flex flex-col items-center justify-center ${color}`}
        >
            <span className="text-sm md:text-base font-bold">{card.rank}</span>
            <span className="text-base md:text-xl">{suitSymbol(card.suit)}</span>
        </div>
    );
}

function EmptyCardSlot() {
    return (
        <div aria-label="Empty card slot" className="w-10 h-14 md:w-14 md:h-20 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center">
            <span className="text-slate-600 text-xs">?</span>
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
        <div className="relative z-20 flex flex-col items-center gap-2">
            <span className="text-slate-400 text-sm font-medium uppercase tracking-wide">
                {ROUND_LABELS[round]}
            </span>
            <div className="flex justify-center items-center gap-1 md:gap-2">
                {cards.map((card, i) => (
                    <CommunityCardDisplay key={i} card={card} />
                ))}
                {Array.from({ length: emptySlots }, (_, i) => (
                    <EmptyCardSlot key={`empty-${i}`} />
                ))}
            </div>
        </div>
    );
}
