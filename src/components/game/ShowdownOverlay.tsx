import { useGameStore } from "../../store/gameStore";

export function ShowdownOverlay() {
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
