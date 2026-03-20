import { useGameStore } from "../../store/gameStore";
import { PlayerProfile } from "./PlayerProfile";
import { CommunityCards } from "./CommunityCards";
import { PotDisplay } from "./PotDisplay";
import { ActionControls } from "./ActionControls";
import { ActionToast } from "./ActionToast";
import { TableHUD } from "./TableHUD";
import { HintPanel } from "./HintPanel";

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
        void processAITurns();
    };

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3">
            <div className="bg-black/80 backdrop-blur-sm rounded-xl border border-neutral-700 px-4 py-3 md:px-6 md:py-4">
                <div className="flex flex-col items-center gap-3">
                    <div className="text-center">
                        <p className="text-emerald-400 font-bold text-base md:text-lg">
                            {winnerPlayer?.name ?? "Unknown"} wins!
                        </p>
                        {winnerHand && (
                            <p className="text-neutral-300 text-sm">
                                {winnerHand}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={viewAnalysis}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
                        >
                            View Analysis
                        </button>
                        <button
                            onClick={handleNextHand}
                            className="bg-neutral-700 hover:bg-neutral-600 text-white px-5 py-2.5 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
                        >
                            Next Hand
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Seat Distribution ───────────────────────────────────────────────

type TablePlacement = "top" | "bottom" | "top-left" | "top-right" | "left" | "right";

interface SeatLayout {
    placement: TablePlacement;
    profilePlacement: "top" | "bottom";
    style: React.CSSProperties;
}

/**
 * Maps player count to seat positions around the oval table.
 * Hero (index 0) is always at the bottom center.
 */
function getSeatLayouts(playerCount: number): SeatLayout[] {
    switch (playerCount) {
        case 2:
            return [
                // Hero - bottom center, anchored to table edge
                {
                    placement: "bottom",
                    profilePlacement: "bottom",
                    style: {
                        position: "absolute",
                        bottom: 0,
                        left: "50%",
                        transform: "translateX(-50%) translateY(30%)",
                    },
                },
                // Villain - top center, anchored to table edge
                {
                    placement: "top",
                    profilePlacement: "top",
                    style: {
                        position: "absolute",
                        top: 0,
                        left: "50%",
                        transform: "translateX(-50%) translateY(-50%)",
                    },
                },
            ];
        case 3:
            return [
                {
                    placement: "bottom",
                    profilePlacement: "bottom",
                    style: {
                        position: "absolute",
                        bottom: 0,
                        left: "50%",
                        transform: "translateX(-50%) translateY(30%)",
                    },
                },
                {
                    placement: "top-left",
                    profilePlacement: "top",
                    style: {
                        position: "absolute",
                        top: "8%",
                        left: "22%",
                        transform: "translateX(-50%) translateY(-50%)",
                    },
                },
                {
                    placement: "top-right",
                    profilePlacement: "top",
                    style: {
                        position: "absolute",
                        top: "8%",
                        right: "22%",
                        transform: "translateX(50%) translateY(-50%)",
                    },
                },
            ];
        case 4:
            return [
                {
                    placement: "bottom",
                    profilePlacement: "bottom",
                    style: {
                        position: "absolute",
                        bottom: 0,
                        left: "50%",
                        transform: "translateX(-50%) translateY(30%)",
                    },
                },
                {
                    placement: "left",
                    profilePlacement: "top",
                    style: {
                        position: "absolute",
                        top: "50%",
                        left: "5%",
                        transform: "translateX(-50%) translateY(-50%)",
                    },
                },
                {
                    placement: "top",
                    profilePlacement: "top",
                    style: {
                        position: "absolute",
                        top: 0,
                        left: "50%",
                        transform: "translateX(-50%) translateY(-50%)",
                    },
                },
                {
                    placement: "right",
                    profilePlacement: "top",
                    style: {
                        position: "absolute",
                        top: "50%",
                        right: "5%",
                        transform: "translateX(50%) translateY(-50%)",
                    },
                },
            ];
        case 5:
            return [
                {
                    placement: "bottom",
                    profilePlacement: "bottom",
                    style: {
                        position: "absolute",
                        bottom: 0,
                        left: "50%",
                        transform: "translateX(-50%) translateY(30%)",
                    },
                },
                {
                    placement: "left",
                    profilePlacement: "top",
                    style: {
                        position: "absolute",
                        top: "50%",
                        left: "5%",
                        transform: "translateX(-50%) translateY(-50%)",
                    },
                },
                {
                    placement: "top-left",
                    profilePlacement: "top",
                    style: {
                        position: "absolute",
                        top: "5%",
                        left: "25%",
                        transform: "translateX(-50%) translateY(-50%)",
                    },
                },
                {
                    placement: "top-right",
                    profilePlacement: "top",
                    style: {
                        position: "absolute",
                        top: "5%",
                        right: "25%",
                        transform: "translateX(50%) translateY(-50%)",
                    },
                },
                {
                    placement: "right",
                    profilePlacement: "top",
                    style: {
                        position: "absolute",
                        top: "50%",
                        right: "5%",
                        transform: "translateX(50%) translateY(-50%)",
                    },
                },
            ];
        case 6:
            return [
                {
                    placement: "bottom",
                    profilePlacement: "bottom",
                    style: {
                        position: "absolute",
                        bottom: 0,
                        left: "50%",
                        transform: "translateX(-50%) translateY(30%)",
                    },
                },
                {
                    placement: "left",
                    profilePlacement: "top",
                    style: {
                        position: "absolute",
                        top: "50%",
                        left: "5%",
                        transform: "translateX(-50%) translateY(-50%)",
                    },
                },
                {
                    placement: "top-left",
                    profilePlacement: "top",
                    style: {
                        position: "absolute",
                        top: "5%",
                        left: "25%",
                        transform: "translateX(-50%) translateY(-50%)",
                    },
                },
                {
                    placement: "top",
                    profilePlacement: "top",
                    style: {
                        position: "absolute",
                        top: 0,
                        left: "50%",
                        transform: "translateX(-50%) translateY(-50%)",
                    },
                },
                {
                    placement: "top-right",
                    profilePlacement: "top",
                    style: {
                        position: "absolute",
                        top: "5%",
                        right: "25%",
                        transform: "translateX(50%) translateY(-50%)",
                    },
                },
                {
                    placement: "right",
                    profilePlacement: "top",
                    style: {
                        position: "absolute",
                        top: "50%",
                        right: "5%",
                        transform: "translateX(50%) translateY(-50%)",
                    },
                },
            ];
        default:
            return [
                {
                    placement: "bottom",
                    profilePlacement: "bottom",
                    style: {
                        position: "absolute",
                        bottom: 0,
                        left: "50%",
                        transform: "translateX(-50%) translateY(30%)",
                    },
                },
                {
                    placement: "top",
                    profilePlacement: "top",
                    style: {
                        position: "absolute",
                        top: 0,
                        left: "50%",
                        transform: "translateX(-50%) translateY(-50%)",
                    },
                },
            ];
    }
}

// ── Watermark ───────────────────────────────────────────────────────

function TableWatermark() {
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <span className="text-white/[0.04] text-4xl md:text-6xl font-bold tracking-widest uppercase select-none">
                GTOBase
            </span>
        </div>
    );
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
    const seatLayouts = getSeatLayouts(players.length);

    return (
        <div className="poker-table-bg flex flex-col h-full">
            {/* ── Table Container ── fills all available space above action bar */}
            <div className="flex-1 flex items-center justify-center min-h-0 relative overflow-visible p-4 md:p-12">
                {/* The Oval Poker Table */}
                <div
                    className="relative w-[85%] max-w-[700px] aspect-[2/1]"
                    style={{ maxHeight: "min(350px, 50vh)" }}
                >
                    {/* Table rail (outer border) */}
                    <div
                        className="absolute inset-0 rounded-[200px] shadow-2xl p-2 md:p-[14px]"
                        style={{
                            background: "linear-gradient(180deg, #404040 0%, #262626 50%, #1a1a1a 100%)",
                        }}
                    >
                        {/* Table felt (inner surface) */}
                        <div
                            className="w-full h-full rounded-[192px] md:rounded-[186px] relative overflow-hidden"
                            style={{
                                background: "radial-gradient(ellipse at center, #1a6b7a 0%, #13546a 40%, #0f4558 100%)",
                            }}
                        >
                            {/* Felt border line (subtle inner edge) */}
                            <div
                                className="absolute inset-1 rounded-[186px] md:rounded-[180px] border border-white/[0.06] pointer-events-none"
                            />

                            <TableWatermark />

                            {/* Center content: pot + community cards + HUD */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 md:gap-2 z-10">
                                <PotDisplay pot={pot} />
                                <CommunityCards
                                    cards={communityCards}
                                    round={currentRound}
                                />
                                <TableHUD />
                            </div>

                            {/* AI action toast */}
                            <ActionToast />
                        </div>
                    </div>

                    {/* Player seats - positioned around the table edge */}
                    {players.map((player, i) => {
                        const layout = seatLayouts[i];
                        if (!layout) return null;

                        return (
                            <div
                                key={player.id}
                                style={layout.style}
                                className={`z-${player.isHero ? "[12]" : "10"} ${isShowdown ? "" : i === activePlayerIndex ? "z-[15]" : ""}`}
                            >
                                <PlayerProfile
                                    player={player}
                                    isActive={
                                        !isShowdown && i === activePlayerIndex
                                    }
                                    isDealer={i === dealerIndex}
                                    seatIndex={i}
                                    dealerIndex={dealerIndex}
                                    playerCount={players.length}
                                    placement={layout.profilePlacement}
                                />
                            </div>
                        );
                    })}

                    {/* Showdown overlay */}
                    {isShowdown && <ShowdownOverlay />}
                </div>
            </div>

            {/* ── Action Bar Container ── dedicated bottom zone, never overlaps table */}
            {!isShowdown && (
                <div className="shrink-0 w-full border-t border-neutral-800 bg-neutral-950 pb-[env(safe-area-inset-bottom,0px)]">
                    <HintPanel />
                    <ActionControls />
                </div>
            )}
        </div>
    );
}
