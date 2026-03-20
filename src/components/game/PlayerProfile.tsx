import { useMemo } from "react";
import type { Card, Player, BettingRound } from "../../types/poker";
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
        <div className="w-5 h-5 bg-yellow-400 text-black rounded-full flex items-center justify-center text-[10px] font-bold shadow-md border border-yellow-500">
            D
        </div>
    );
}

// ── Player Profile Component ────────────────────────────────────────

interface PlayerProfileProps {
    player: Player;
    isActive: boolean;
    isDealer: boolean;
    seatIndex: number;
    dealerIndex: number;
    playerCount: number;
    placement: "top" | "bottom";
}

export function PlayerProfile({
    player,
    isActive,
    isDealer,
    seatIndex,
    dealerIndex,
    playerCount,
    placement,
}: PlayerProfileProps) {
    const currentRound = useGameStore((s) => s.currentRound);
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
    const statusText = getStatusText(
        player,
        currentRound,
        isHeroTurn,
        isFolded,
        isAllIn,
    );
    const statusColor = isHeroTurn
        ? "text-emerald-400"
        : isFolded
          ? "text-neutral-500"
          : isAllIn
            ? "text-red-400"
            : "text-neutral-400";

    const activeRing = isActive
        ? "ring-2 ring-emerald-400/60 motion-safe:animate-pulse"
        : "";
    const winnerRing = isWinner
        ? "ring-2 ring-emerald-400 shadow-lg shadow-emerald-500/30"
        : "";

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
                className={`relative flex flex-col items-center ${activeRing} ${winnerRing} ${isFolded ? "opacity-40" : ""}`}
            >
                {/* Cards */}
                <div className="flex gap-0.5 relative z-10">
                    <PlayerCards
                        cards={player.holeCards}
                        showCards={showCards}
                        isFolded={isFolded}
                    />
                </div>

                {/* Info box */}
                <div className="bg-neutral-800/95 rounded-b-lg border border-neutral-700 border-t-0 px-1.5 py-0.5 sm:px-2 sm:py-1 md:px-3 md:py-1.5 min-w-[70px] sm:min-w-[80px] md:min-w-[130px] relative -mt-0.5">
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

                    {/* Name and stack row */}
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-white font-bold text-[9px] sm:text-[10px] md:text-xs uppercase tracking-wider">
                            {player.name}
                        </span>
                        <span className="text-white text-[9px] sm:text-[10px] md:text-xs font-medium">
                            {player.stack.toFixed(2)}
                        </span>
                    </div>

                    {/* Status row */}
                    <div className="flex items-center justify-between mt-0.5">
                        <span className={`text-[9px] sm:text-[10px] md:text-[11px] font-medium ${statusColor}`}>
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
    _currentRound: BettingRound,
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
