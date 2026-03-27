import type { Card, Suit } from "../../types/poker";
import { suitSymbol } from "../../lib/deck";

// ── 2-Color Classic Mapping ─────────────────────────────────────────

const SUIT_COLOR: Record<Suit, string> = {
    hearts: "text-red-500",
    diamonds: "text-red-500",
    clubs: "text-neutral-800",
    spades: "text-neutral-800",
};

// ── Face-Down Card ──────────────────────────────────────────────────

function FaceDownCard({ className = "" }: { className?: string }) {
    return (
        <div
            aria-label="Face-down card"
            className={`w-8 h-12 sm:w-10 sm:h-14 md:w-12 md:h-16 rounded-md border border-neutral-600 flex items-center justify-center ${className}`}
            style={{
                background: `repeating-linear-gradient(
                    135deg,
                    var(--sd-rail) 0px,
                    var(--sd-rail) 4px,
                    var(--sd-rail-highlight) 4px,
                    var(--sd-rail-highlight) 8px
                )`,
            }}
        >
            <div
                className="w-5 h-7 sm:w-6 sm:h-8 md:w-7 md:h-10 rounded-sm border"
                style={{ borderColor: "var(--sd-rail-highlight)" }}
            />
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

    const textClass = SUIT_COLOR[card.suit];

    return (
        <div
            aria-label={`${card.rank} of ${card.suit}`}
            className={`w-8 h-12 sm:w-10 sm:h-14 md:w-12 md:h-16 bg-neutral-100 rounded-md border border-neutral-300 flex flex-col items-center justify-center gap-0 shadow-md animate-sd-fade-in ${textClass} ${className}`}
        >
            <span className="text-xs sm:text-sm md:text-base font-bold leading-tight">
                {card.rank}
            </span>
            <span className="text-xs sm:text-sm md:text-base leading-tight">
                {suitSymbol(card.suit)}
            </span>
        </div>
    );
}

export { FaceDownCard };
