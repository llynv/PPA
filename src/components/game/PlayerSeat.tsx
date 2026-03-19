import { useSyncExternalStore } from "react";
import { useMemo } from "react";
import type { Card, Player, BettingRound } from "../../types/poker";
import { suitSymbol, suitColor } from "../../lib/deck";
import { useGameStore } from "../../store/gameStore";
import { getPosition } from "../../lib/poker-engine";
import { getBestHand } from "../../lib/evaluator";

// ── Orientation Hook ────────────────────────────────────────────────

const landscapeQuery =
    typeof window !== "undefined"
        ? window.matchMedia("(orientation: landscape)")
        : null;

function subscribeOrientation(cb: () => void) {
    landscapeQuery?.addEventListener("change", cb);
    return () => landscapeQuery?.removeEventListener("change", cb);
}

function getIsLandscape() {
    return landscapeQuery?.matches ?? false;
}

export function useIsLandscape() {
    return useSyncExternalStore(subscribeOrientation, getIsLandscape);
}

// ── Card Display ────────────────────────────────────────────────────

function CardDisplay({
    card,
    faceDown = false,
}: {
    card: Card;
    faceDown?: boolean;
}) {
    if (faceDown) {
        return (
            <div aria-label="Face-down card" className="w-7 h-10 md:w-12 md:h-16 bg-slate-600 rounded-lg border border-slate-500 flex items-center justify-center">
                <span className="text-slate-400 text-xs">🂠</span>
            </div>
        );
    }

    const color =
        suitColor(card.suit) === "red" ? "text-red-500" : "text-slate-800";

    return (
        <div
            aria-label={`${card.rank} of ${card.suit}`}
            className={`w-7 h-10 md:w-12 md:h-16 bg-white rounded-lg border border-slate-300 flex flex-col items-center justify-center ${color}`}
        >
            <span className="text-[10px] md:text-sm font-bold">{card.rank}</span>
            <span className="text-xs md:text-lg">{suitSymbol(card.suit)}</span>
        </div>
    );
}

// ── Position CSS ────────────────────────────────────────────────────

type SeatPosition =
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-left"
    | "top-right";

/** Portrait: percentage-based coordinates (scales with container) */
const POSITION_COORDS: Record<SeatPosition, { top: string; left: string }> = {
    top:            { top: "2%",  left: "50%" },
    bottom:         { top: "95%", left: "50%" },
    left:           { top: "50%", left: "3%" },
    right:          { top: "50%", left: "97%" },
    "top-left":     { top: "15%", left: "15%" },
    "top-right":    { top: "15%", left: "85%" },
};

/** Landscape: original fixed Tailwind classes (scrollable layout) */
const POSITION_CLASSES: Record<SeatPosition, string> = {
    top: "absolute top-2 left-1/2 -translate-x-1/2",
    bottom: "absolute bottom-2 left-1/2 -translate-x-1/2",
    left: "absolute left-2 top-1/2 -translate-y-1/2",
    right: "absolute right-2 top-1/2 -translate-y-1/2",
    "top-left": "absolute top-6 left-8",
    "top-right": "absolute top-6 right-8",
};

// ── Personality Labels ──────────────────────────────────────────────

const PERSONALITY_LABELS: Record<string, string> = {
    TAG: "TAG",
    LAG: "LAG",
    "tight-passive": "TP",
    "loose-passive": "LP",
};

// ── Component ───────────────────────────────────────────────────────

interface PlayerSeatProps {
    player: Player;
    isActive: boolean;
    isDealer: boolean;
    position: SeatPosition;
    seatIndex: number;
    dealerIndex: number;
    playerCount: number;
}

export function PlayerSeat({
    player,
    isActive,
    isDealer,
    position,
    seatIndex,
    dealerIndex,
    playerCount,
}: PlayerSeatProps) {
    const currentRound = useGameStore((s) => s.currentRound);
    const gamePhase = useGameStore((s) => s.gamePhase);
    const winner = useGameStore((s) => s.winner);
    const communityCards = useGameStore((s) => s.communityCards);
    const isLandscape = useIsLandscape();

    const showCards = player.isHero || gamePhase === "showdown";

    // Compute hand rank description at showdown for non-folded players
    const handDescription = useMemo(() => {
        if (
            gamePhase !== "showdown" ||
            player.isFolded ||
            player.holeCards.length < 2 ||
            communityCards.length < 5
        ) {
            return null;
        }
        const evaluation = getBestHand(player.holeCards, communityCards);
        return evaluation.description;
    }, [gamePhase, player.isFolded, player.holeCards, communityCards]);
    const isFolded = player.isFolded;
    const isAllIn = player.isAllIn;
    const isWinner = gamePhase === "showdown" && player.id === winner;

    // Poker position label (BTN, SB, BB, UTG, etc.)
    const pokerPosition = getPosition(seatIndex, dealerIndex, playerCount);

    // Z-index hierarchy: active z-[15], hero z-[12], others z-10
    const zClass = isActive ? "z-[15]" : player.isHero ? "z-[12]" : "z-10";

    // Active pulse: ring animation (respects prefers-reduced-motion via Tailwind's motion-safe)
    const activeRingClass = isActive
        ? "ring-2 ring-emerald-400 border-emerald-500 motion-safe:animate-pulse"
        : "";

    // Landscape: use original fixed Tailwind classes (scrollable layout)
    // Portrait: use percentage-based coordinates (fits viewport)
    const positionProps = isLandscape
        ? { className: `${POSITION_CLASSES[position]} ${zClass}` }
        : {
              className: `absolute ${zClass}`,
              style: {
                  top: POSITION_COORDS[position].top,
                  left: POSITION_COORDS[position].left,
                  transform: "translate(-50%, -50%)",
              },
          };

    return (
        <div {...positionProps}>
            <div
                aria-label={`${player.name}, ${pokerPosition} position, stack ${player.stack}`}
                className={`
          relative flex flex-col items-center gap-0.5 md:gap-1 p-1 md:p-2.5 rounded-xl bg-slate-800 border
          ${isWinner ? "ring-2 ring-emerald-400 border-emerald-500 shadow-lg shadow-emerald-500/30" : activeRingClass || "border-slate-600"}
          ${isFolded ? "opacity-40" : ""}
          min-w-[80px] md:min-w-[120px]
        `}
            >
                {/* Dealer button */}
                {isDealer && (
                    <div className="absolute -top-2 -right-2 w-5 h-5 md:w-6 md:h-6 bg-yellow-400 text-slate-900 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold">
                        D
                    </div>
                )}

                {/* Player name + personality */}
                <div className="text-center">
                    <span className="text-white font-bold text-[11px] md:text-sm leading-tight">
                        {player.name}
                    </span>
                    {player.personality && (
                        <span className="text-slate-400 text-[10px] md:text-xs ml-1">
                            (
                            {PERSONALITY_LABELS[player.personality] ??
                                player.personality}
                            )
                        </span>
                    )}
                </div>

                {/* Position label badge */}
                <span className="bg-slate-700 text-slate-300 text-[10px] md:text-xs px-1.5 py-0.5 rounded font-medium">
                    {pokerPosition}
                </span>

                {/* Stack */}
                <div className="text-emerald-400 text-[11px] md:text-sm font-medium">
                    ${player.stack.toLocaleString()}
                </div>

                {/* Hole cards */}
                <HoleCards
                    cards={player.holeCards}
                    showCards={showCards}
                    isFolded={isFolded}
                    currentRound={currentRound}
                />

                {/* Hand rank at showdown */}
                {handDescription && (
                    <span className="text-[10px] md:text-xs text-slate-300 bg-slate-700 px-1.5 py-0.5 rounded mt-0.5">
                        {handDescription}
                    </span>
                )}

                {/* Status badges */}
                {isFolded && (
                    <span className="text-[10px] md:text-xs bg-slate-600 text-slate-300 px-1.5 md:px-2 py-0.5 rounded font-medium">
                        FOLD
                    </span>
                )}
                {isAllIn && !isFolded && (
                    <span className="text-[10px] md:text-xs bg-red-600 text-white px-1.5 md:px-2 py-0.5 rounded font-bold">
                        ALL IN
                    </span>
                )}

                {/* Current bet */}
                {player.currentBet > 0 && (
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-[5] bg-amber-600 text-white text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                        ${player.currentBet}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Hole Cards sub-component ────────────────────────────────────────

function HoleCards({
    cards,
    showCards,
    isFolded,
    currentRound: _currentRound,
}: {
    cards: Card[];
    showCards: boolean;
    isFolded: boolean;
    currentRound: BettingRound;
}) {
    if (cards.length === 0 || isFolded) return null;

    return (
        <div className="flex gap-1">
            {cards.map((card, i) => (
                <CardDisplay key={i} card={card} faceDown={!showCards} />
            ))}
        </div>
    );
}
