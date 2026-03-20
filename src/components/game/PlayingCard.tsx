import type { Card, Suit } from "../../types/poker";
import { suitSymbol } from "../../lib/deck";

// ── 4-Color Deck Mapping ────────────────────────────────────────────

const SUIT_BG: Record<Suit, string> = {
    spades: "bg-neutral-900",
    hearts: "bg-red-600",
    diamonds: "bg-blue-600",
    clubs: "bg-green-600",
};

const SUIT_TEXT: Record<Suit, string> = {
    spades: "text-white",
    hearts: "text-white",
    diamonds: "text-white",
    clubs: "text-white",
};

// ── Face-Down Card ──────────────────────────────────────────────────

function FaceDownCard({ className = "" }: { className?: string }) {
    return (
        <div
            aria-label="Face-down card"
            className={`w-10 h-14 md:w-12 md:h-[68px] rounded-md border border-neutral-600 flex items-center justify-center ${className}`}
            style={{
                background: `repeating-linear-gradient(
                    135deg,
                    #991b1b,
                    #991b1b 4px,
                    #7f1d1d 4px,
                    #7f1d1d 8px
                )`,
            }}
        >
            <div className="w-6 h-8 md:w-7 md:h-10 rounded-sm border border-red-700/40" />
        </div>
    );
}

// ── PlayingCard Component ───────────────────────────────────────────

interface PlayingCardProps {
    card: Card;
    faceDown?: boolean;
    className?: string;
}

export function PlayingCard({
    card,
    faceDown = false,
    className = "",
}: PlayingCardProps) {
    if (faceDown) {
        return <FaceDownCard className={className} />;
    }

    const bgClass = SUIT_BG[card.suit];
    const textClass = SUIT_TEXT[card.suit];

    return (
        <div
            aria-label={`${card.rank} of ${card.suit}`}
            className={`w-10 h-14 md:w-12 md:h-[68px] ${bgClass} rounded-md border border-white/20 flex flex-col items-center justify-center gap-0 shadow-md ${textClass} ${className}`}
        >
            <span className="text-sm md:text-base font-bold leading-tight">
                {card.rank}
            </span>
            <span className="text-sm md:text-base leading-tight">
                {suitSymbol(card.suit)}
            </span>
        </div>
    );
}

export { FaceDownCard };
