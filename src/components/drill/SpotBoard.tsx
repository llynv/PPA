import type { DrillSpot } from '../../types/drill';
import { PlayingCard, FaceDownCard } from '../game/PlayingCard';

// ── Spot Board ──────────────────────────────────────────────────────
// Displays the current drill spot as a frozen board state:
// hero cards, community cards, pot, stacks, positions, and action context.

interface SpotBoardProps {
    spot: DrillSpot;
}

export function SpotBoard({ spot }: SpotBoardProps) {
    const {
        heroCards,
        communityCards,
        potSize,
        heroStack,
        villainStack,
        heroPosition,
        villainPosition,
        previousActions,
        name,
        description,
    } = spot;

    // Fill community cards to 5 slots for consistent layout
    const boardSlots = 5;
    const visibleCount = communityCards.length;

    return (
        <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
            {/* Spot header */}
            <div className="text-center">
                <h2 className="text-lg font-bold text-amber-400">{name}</h2>
                <p className="text-sm text-neutral-400 mt-0.5">{description}</p>
            </div>

            {/* Villain info */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                    {villainPosition}
                </span>
                <div className="flex gap-1">
                    <FaceDownCard className="!w-6 !h-9 sm:!w-7 sm:!h-10" />
                    <FaceDownCard className="!w-6 !h-9 sm:!w-7 sm:!h-10" />
                </div>
                <span className="text-sm text-neutral-300">
                    ${villainStack.toLocaleString()}
                </span>
            </div>

            {/* Board / community cards area */}
            <div className="bg-neutral-800/60 border border-neutral-700 rounded-xl px-4 py-3 w-full">
                {/* Pot */}
                <div className="text-center mb-3">
                    <span className="text-xs text-neutral-500 uppercase tracking-wide">Pot</span>
                    <p className="text-xl font-bold text-neutral-100">
                        ${potSize.toLocaleString()}
                    </p>
                </div>

                {/* Community cards */}
                <div className="flex justify-center gap-1.5">
                    {Array.from({ length: boardSlots }).map((_, i) =>
                        i < visibleCount ? (
                            <PlayingCard key={i} card={communityCards[i]} />
                        ) : (
                            <div
                                key={i}
                                className="w-8 h-12 sm:w-10 sm:h-14 md:w-12 md:h-16 rounded-md border border-neutral-700/40 bg-neutral-800/40"
                            />
                        ),
                    )}
                </div>
            </div>

            {/* Action context */}
            {previousActions && (
                <div className="text-center">
                    <span className="text-xs text-neutral-500 uppercase tracking-wide">
                        Action
                    </span>
                    <p className="text-sm text-neutral-300 mt-0.5">
                        {previousActions}
                    </p>
                </div>
            )}

            {/* Hero info */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                    {heroPosition}
                </span>
                <div className="flex gap-1">
                    <PlayingCard card={heroCards[0]} />
                    <PlayingCard card={heroCards[1]} />
                </div>
                <span className="text-sm text-neutral-300">
                    ${heroStack.toLocaleString()}
                </span>
            </div>
        </div>
    );
}
