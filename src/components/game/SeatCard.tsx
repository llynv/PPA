import { useMemo } from "react";
import type { Card, Player } from "../../types/poker";
import { PlayingCard, FaceDownCard } from "./PlayingCard";
import { useGameStore } from "../../store/gameStore";
import { getPosition } from "../../lib/poker-engine";
import { getBestHand } from "../../lib/evaluator";

// ── Position Tag Colors ─────────────────────────────────────────────

const POSITION_TAG_COLORS: Record<string, string> = {
    SB: "bg-red-600 text-white",
    BB: "bg-yellow-500 text-black",
    BTN: "bg-yellow-400 text-black",
    UTG: "bg-neutral-600 text-white",
    UTG1: "bg-neutral-600 text-white",
    MP: "bg-neutral-600 text-white",
    LJ: "bg-neutral-600 text-white",
    HJ: "bg-neutral-600 text-white",
    CO: "bg-neutral-600 text-white",
};

// ── Bet Chip ────────────────────────────────────────────────────────

function BetChip({ amount }: { amount: number }) {
    return (
        <div className="flex items-center gap-1">
            <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-neutral-800 border-2 border-neutral-600 flex items-center justify-center shadow-md">
                <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border border-neutral-500 bg-neutral-700" />
            </div>
            <span className="text-white text-[10px] md:text-xs font-medium">
                {amount.toFixed(2)}
            </span>
        </div>
    );
}

// ── Dealer Button ───────────────────────────────────────────────────

function DealerButton() {
    return (
        <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-md border"
            style={{
                backgroundColor: "var(--sd-brass)",
                borderColor: "var(--sd-brass-muted)",
                color: "#000",
            }}
        >
            D
        </div>
    );
}

// ── SeatCard Component ──────────────────────────────────────────────

interface SeatCardProps {
    player: Player;
    isActive: boolean;
    isDealer: boolean;
    seatIndex: number;
    dealerIndex: number;
    playerCount: number;
    placement: "top" | "bottom";
}

export function SeatCard({
    player,
    isActive,
    isDealer,
    seatIndex,
    dealerIndex,
    playerCount,
    placement,
}: SeatCardProps) {
    const gamePhase = useGameStore((s) => s.gamePhase);
    const winner = useGameStore((s) => s.winner);
    const communityCards = useGameStore((s) => s.communityCards);
    const activePlayerIndex = useGameStore((s) => s.activePlayerIndex);
    const players = useGameStore((s) => s.players);

    const showCards = player.isHero || gamePhase === "showdown";
    const isFolded = player.isFolded;
    const isAllIn = player.isAllIn;
    const isWinner = gamePhase === "showdown" && player.id === winner;
    const isHeroTurn =
        player.isHero && players[activePlayerIndex]?.isHero === true;

    const pokerPosition = getPosition(seatIndex, dealerIndex, playerCount);
    const positionTagColor =
        POSITION_TAG_COLORS[pokerPosition] ?? "bg-neutral-600 text-white";

    // Hand rank at showdown
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

    // Determine status text for the bottom line of the info box
    const statusText = getStatusText(player, isHeroTurn, isFolded, isAllIn);
    const statusColor = isHeroTurn
        ? "text-emerald-400"
        : isFolded
          ? "text-neutral-500"
          : isAllIn
            ? "text-red-400 motion-safe:animate-pulse"
            : "text-neutral-400";

    // Active ring uses --sd-brass instead of emerald
    const activeRingStyle: React.CSSProperties = isActive
        ? {
              boxShadow: "0 0 0 2px color-mix(in srgb, var(--sd-brass) 60%, transparent)",
          }
        : {};
    const activeClass = isActive ? "motion-safe:animate-pulse" : "";

    // Winner ring uses --sd-brass
    const winnerRingStyle: React.CSSProperties = isWinner
        ? {
              boxShadow: `0 0 0 2px var(--sd-brass), 0 4px 14px color-mix(in srgb, var(--sd-brass) 30%, transparent)`,
          }
        : {};

    return (
        <div
            className={`flex flex-col items-center ${placement === "top" ? "flex-col" : "flex-col-reverse"}`}
        >
            {/* Bet chip - shown inside the table area */}
            {player.currentBet > 0 && (
                <div
                    className={`${placement === "top" ? "mb-2" : "mt-2"} z-[5]`}
                >
                    <BetChip amount={player.currentBet} />
                </div>
            )}

            {/* Main profile card */}
            <div
                aria-label={`${player.name}, ${pokerPosition} position, stack ${player.stack}`}
                data-active={isActive || undefined}
                data-winner={isWinner || undefined}
                data-folded={isFolded || undefined}
                className={`relative flex flex-col items-center transition-opacity duration-200 ${activeClass} ${isFolded ? "opacity-40" : ""}`}
                style={{ ...activeRingStyle, ...winnerRingStyle }}
            >
                {/* Cards */}
                <div className="flex gap-0.5 relative z-10">
                    <PlayerCards
                        cards={player.holeCards}
                        showCards={showCards}
                        isFolded={isFolded}
                    />
                </div>

                {/* Info box — SD surface */}
                <div
                    className="rounded-b-lg border border-neutral-700 border-t-0 px-1.5 py-0.5 sm:px-2 sm:py-1 md:px-3 md:py-1.5 min-w-[70px] sm:min-w-[80px] md:min-w-[130px] relative -mt-0.5"
                    style={{ backgroundColor: "var(--sd-surface)" }}
                >
                    {/* Position tag */}
                    <div className="absolute -top-2 -right-2 z-20">
                        <span
                            className={`${positionTagColor} text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded`}
                        >
                            {pokerPosition}
                        </span>
                    </div>

                    {/* Dealer button */}
                    {isDealer && (
                        <div className="absolute -top-2 -left-2 z-20">
                            <DealerButton />
                        </div>
                    )}

                    {/* Name — Space Grotesk, uppercase */}
                    <div className="flex items-center justify-between gap-2">
                        <span
                            className="text-white font-bold text-[9px] sm:text-[10px] md:text-xs uppercase tracking-wider"
                            style={{ fontFamily: "var(--sd-font-display)" }}
                        >
                            {player.name}
                        </span>
                        {/* Stack — IBM Plex Mono, brass */}
                        <span
                            className="text-[9px] sm:text-[10px] md:text-xs font-medium"
                            style={{
                                fontFamily: "var(--sd-font-mono)",
                                color: "var(--sd-brass)",
                            }}
                        >
                            {player.stack.toFixed(2)}
                        </span>
                    </div>

                    {/* Status row */}
                    <div className="flex items-center justify-between mt-0.5">
                        <span
                            className={`text-[9px] sm:text-[10px] md:text-[11px] font-medium ${statusColor}`}
                        >
                            {statusText}
                        </span>
                    </div>

                    {/* Hand description at showdown */}
                    {handDescription && (
                        <div className="text-[10px] text-neutral-300 bg-neutral-700 px-1 py-0.5 rounded mt-1 text-center">
                            {handDescription}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Player Cards sub-component ──────────────────────────────────────

function PlayerCards({
    cards,
    showCards,
    isFolded,
}: {
    cards: Card[];
    showCards: boolean;
    isFolded: boolean;
}) {
    if (cards.length === 0 || isFolded) {
        return (
            <>
                <FaceDownCard className="opacity-30" />
                <FaceDownCard className="opacity-30 -ml-2" />
            </>
        );
    }

    return (
        <>
            {cards.map((card, i) => (
                <PlayingCard
                    key={i}
                    card={card}
                    faceDown={!showCards}
                    className={i > 0 ? "-ml-2" : ""}
                />
            ))}
        </>
    );
}

// ── Status Text Helper ──────────────────────────────────────────────

function getStatusText(
    player: Player,
    isHeroTurn: boolean,
    isFolded: boolean,
    isAllIn: boolean,
): string {
    if (isFolded) return "Folded";
    if (isAllIn) return "All In";
    if (isHeroTurn && player.isHero) return "Choose";
    if (player.currentBet > 0) return `Bet ${player.currentBet.toFixed(2)}`;
    return "";
}
