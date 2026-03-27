import { useGameStore } from "../../store/gameStore";
import { GameTopBar } from "./GameTopBar";
import { SeatRing } from "./SeatRing";
import { BoardCenter } from "./BoardCenter";
import { ShowdownOverlay } from "./ShowdownOverlay";
import { HeroDock } from "./HeroDock";
import { CoachPanel } from "./CoachPanel";

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

// ── TableShell ──────────────────────────────────────────────────────

export function TableShell() {
    const players = useGameStore((s) => s.players);
    const activePlayerIndex = useGameStore((s) => s.activePlayerIndex);
    const dealerIndex = useGameStore((s) => s.dealerIndex);
    const gamePhase = useGameStore((s) => s.gamePhase);
    const isShowdown = gamePhase === "showdown";

    return (
        <div className="flex flex-col h-full" style={{ background: "var(--sd-bg)" }}>
            <GameTopBar />
            <div className="flex-1 flex min-h-0">
                {/* Table + dock column */}
                <div className="flex-1 flex flex-col min-h-0">
                    {/* Table stage */}
                    <div className="flex-1 relative flex items-center justify-center p-4 md:p-8">
                        {/* Oval table with felt */}
                        <div
                            className="relative w-[90%] max-w-[700px] aspect-[2/1]"
                            style={{ maxHeight: "min(350px, 50vh)" }}
                        >
                            {/* Rail */}
                            <div
                                className="absolute inset-0 rounded-[200px] p-2 md:p-[14px]"
                                style={{
                                    background:
                                        "linear-gradient(180deg, var(--sd-rail-highlight), var(--sd-rail))",
                                }}
                            >
                                {/* Felt */}
                                <div
                                    className="w-full h-full rounded-[186px] relative overflow-hidden"
                                    style={{
                                        background:
                                            "radial-gradient(ellipse, var(--sd-felt), var(--sd-felt-edge))",
                                    }}
                                >
                                    <TableWatermark />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 md:gap-2 z-10">
                                        <BoardCenter />
                                    </div>
                                </div>
                            </div>
                            <SeatRing
                                players={players}
                                activePlayerIndex={activePlayerIndex}
                                dealerIndex={dealerIndex}
                                isShowdown={isShowdown}
                            />
                            {isShowdown && <ShowdownOverlay />}
                        </div>
                    </div>

                    {/* Hero dock */}
                    {!isShowdown && <HeroDock />}

                    {/* Mobile coach sheet */}
                    <CoachPanel variant="mobile" />
                </div>

                {/* Desktop coach rail */}
                <CoachPanel variant="desktop" />
            </div>
        </div>
    );
}
