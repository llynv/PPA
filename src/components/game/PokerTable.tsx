import { useGameStore } from "../../store/gameStore";
import { SeatRing } from "./SeatRing";
import { BoardCenter } from "./BoardCenter";

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
    const activePlayerIndex = useGameStore((s) => s.activePlayerIndex);
    const dealerIndex = useGameStore((s) => s.dealerIndex);
    const gamePhase = useGameStore((s) => s.gamePhase);

    const isShowdown = gamePhase === "showdown";

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

                            {/* Center content: pot + community cards + activity ribbon */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 md:gap-2 z-10">
                                <BoardCenter />
                            </div>
                        </div>
                    </div>

                    {/* Player seats - trigonometric ring around the table */}
                    <SeatRing
                        players={players}
                        activePlayerIndex={activePlayerIndex}
                        dealerIndex={dealerIndex}
                        isShowdown={isShowdown}
                    />

                    {/* Showdown overlay */}
                    {isShowdown && <ShowdownOverlay />}
                </div>
            </div>

        </div>
    );
}
