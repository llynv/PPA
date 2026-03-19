import { useGameStore } from "../../store/gameStore";
import { PlayerSeat, useIsLandscape } from "./PlayerSeat";
import { CommunityCards } from "./CommunityCards";
import { PotDisplay } from "./PotDisplay";
import { ActionControls } from "./ActionControls";

// ── Showdown Overlay ────────────────────────────────────────────────

function ShowdownOverlay() {
    const winner = useGameStore((s) => s.winner);
    const winnerHand = useGameStore((s) => s.winnerHand);
    const players = useGameStore((s) => s.players);
    const viewAnalysis = useGameStore((s) => s.viewAnalysis);
    const startHand = useGameStore((s) => s.startHand);
    const processAITurns = useGameStore((s) => s.processAITurns);

    const winnerPlayer = players.find((p) => p.id === winner);

    const handleNextHand = () => {
        startHand();
        processAITurns();
    };

    return (
        <div className="bg-slate-900 border-t border-slate-700 p-4 pb-[env(safe-area-inset-bottom,16px)] flex-shrink-0">
            <div className="flex flex-col items-center gap-3">
                <div className="text-center">
                    <p className="text-emerald-400 font-bold text-lg">
                        {winnerPlayer?.name ?? "Unknown"} wins!
                    </p>
                    {winnerHand && (
                        <p className="text-slate-300 text-sm">{winnerHand}</p>
                    )}
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={viewAnalysis}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
                    >
                        View Analysis
                    </button>
                    <button
                        onClick={handleNextHand}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
                    >
                        Next Hand
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Seat Positions ──────────────────────────────────────────────────

type SeatPosition =
    | "top"
    | "bottom"
    | "left"
    | "right"
    | "top-left"
    | "top-right";

/**
 * Returns seat positions arranged around the table.
 * Hero (index 0) is always at the bottom center.
 * Opponents are distributed around the remaining positions.
 */
function getSeatPositions(playerCount: number): SeatPosition[] {
    switch (playerCount) {
        case 2:
            return ["bottom", "top"];
        case 3:
            return ["bottom", "top-left", "top-right"];
        case 4:
            return ["bottom", "top-left", "top", "top-right"];
        case 5:
            return ["bottom", "left", "top-left", "top-right", "right"];
        case 6:
            return ["bottom", "left", "top-left", "top", "top-right", "right"];
        default:
            return ["bottom", "top"];
    }
}

// ── Component ───────────────────────────────────────────────────────

export function PokerTable() {
    const players = useGameStore((s) => s.players);
    const communityCards = useGameStore((s) => s.communityCards);
    const pot = useGameStore((s) => s.pot);
    const currentRound = useGameStore((s) => s.currentRound);
    const activePlayerIndex = useGameStore((s) => s.activePlayerIndex);
    const dealerIndex = useGameStore((s) => s.dealerIndex);
    const gamePhase = useGameStore((s) => s.gamePhase);

    const isShowdown = gamePhase === "showdown";
    const seatPositions = getSeatPositions(players.length);
    const isLandscape = useIsLandscape();

    // Portrait: h-full fills viewport, overflow-visible for edge seats
    // Landscape: original aspect-[16/10] scrollable layout
    const tableClasses = isLandscape
        ? `relative w-full max-w-3xl aspect-[16/10] max-h-full
           bg-slate-950 border-4 border-slate-700
           rounded-[60px] md:rounded-[100px]
           flex flex-col items-center justify-center gap-3`
        : `relative w-full max-w-3xl h-full
           bg-slate-950 border-4 border-slate-700
           rounded-[60px] md:rounded-[100px]
           flex flex-col items-center justify-center gap-2 md:gap-3
           overflow-visible`;

    return (
        <div className="flex flex-col h-full">
            {/* Table area */}
            <div className="flex-1 flex items-center justify-center p-2 md:p-4 min-h-0">
                <div className={tableClasses}>
                    {/* Player seats */}
                    {players.map((player, i) => (
                        <PlayerSeat
                            key={player.id}
                            player={player}
                            isActive={!isShowdown && i === activePlayerIndex}
                            isDealer={i === dealerIndex}
                            position={seatPositions[i] ?? "top"}
                        />
                    ))}

                    {/* Community cards */}
                    <CommunityCards
                        cards={communityCards}
                        round={currentRound}
                    />

                    {/* Pot */}
                    <PotDisplay pot={pot} />
                </div>
            </div>

            {/* Action controls or showdown overlay */}
            {isShowdown ? <ShowdownOverlay /> : <ActionControls />}
        </div>
    );
}
