import { useGameStore } from "../../store/gameStore";

export function ShowdownOverlay() {
    const winner = useGameStore((s) => s.winner);
    const winnerIds = useGameStore((s) => s.winnerIds);
    const winnerHand = useGameStore((s) => s.winnerHand);
    const potWon = useGameStore((s) => s.potWon);
    const players = useGameStore((s) => s.players);
    const viewAnalysis = useGameStore((s) => s.viewAnalysis);
    const startHand = useGameStore((s) => s.startHand);
    const processAITurns = useGameStore((s) => s.processAITurns);

    const isSplitPot = winnerIds && winnerIds.length > 1;

    // For split pot: show all winner names
    const winnerNames = isSplitPot
        ? winnerIds.map((id) => players.find((p) => p.id === id)?.name ?? "Unknown")
        : null;

    // For single winner (backward compat)
    const winnerPlayer = !isSplitPot
        ? players.find((p) => p.id === winner)
        : null;

    const handleNextHand = () => {
        startHand();
        void processAITurns();
    };

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3">
            <div
                className="backdrop-blur-sm rounded-xl border px-4 py-3 md:px-6 md:py-4"
                style={{
                    backgroundColor: "color-mix(in srgb, var(--sd-surface) 80%, transparent)",
                    borderColor: "var(--sd-rail-highlight)",
                }}
            >
                <div className="flex flex-col items-center gap-3">
                    <div className="text-center">
                        <p
                            className="font-bold text-base md:text-lg"
                            style={{
                                color: "var(--sd-brass)",
                                fontFamily: "var(--sd-font-display)",
                            }}
                        >
                            {isSplitPot
                                ? `Split Pot! ${winnerNames!.join(" and ")} chop`
                                : `${winnerPlayer?.name ?? "Unknown"} wins!`}
                        </p>
                        {winnerHand && (
                            <p
                                className="text-sm"
                                style={{ color: "var(--sd-ivory)" }}
                            >
                                {winnerHand}
                            </p>
                        )}
                        {potWon != null && potWon > 0 && (
                            <p
                                className="text-xs mt-0.5"
                                style={{ color: "var(--sd-ivory)", opacity: 0.7 }}
                            >
                                Pot: {potWon.toFixed(2)}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={viewAnalysis}
                            aria-label="View hand analysis"
                            className="px-5 py-2.5 rounded-lg font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--sd-brass)] focus-visible:outline-none"
                            style={{
                                backgroundColor: "var(--sd-brass)",
                                color: "#000",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--sd-brass-muted)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--sd-brass)";
                            }}
                        >
                            View Analysis
                        </button>
                        <button
                            onClick={handleNextHand}
                            aria-label="Deal next hand"
                            className="px-5 py-2.5 rounded-lg font-medium transition-colors border focus-visible:ring-2 focus-visible:ring-[var(--sd-brass)] focus-visible:outline-none"
                            style={{
                                backgroundColor: "transparent",
                                borderColor: "var(--sd-rail-highlight)",
                                color: "var(--sd-ivory)",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "var(--sd-surface)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent";
                            }}
                        >
                            Next Hand
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
