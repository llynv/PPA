import { useGameStore } from "../../store/gameStore";

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const gamePhase = useGameStore((s) => s.gamePhase);
    const handNumber = useGameStore((s) => s.handNumber);
    const resetGame = useGameStore((s) => s.resetGame);

    const isGameView = gamePhase === "playing" || gamePhase === "showdown";

    return (
        <div
            className="flex flex-col bg-neutral-950 text-neutral-100 h-dvh overflow-hidden"
        >
            <nav className="bg-neutral-900 border-b border-neutral-800 px-4 py-2 flex flex-row items-center justify-between flex-shrink-0">
                <span className="text-emerald-400 font-bold text-lg">PPA</span>

                {gamePhase !== "settings" && (
                    <div className="flex items-center gap-4">
                        <span className="text-neutral-400 text-sm">
                            Hand #{handNumber}
                        </span>
                        <button
                            onClick={resetGame}
                            className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors border border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-400"
                        >
                            New Game
                        </button>
                    </div>
                )}
            </nav>

            <main
                className={`flex-1 min-h-0 ${isGameView ? "" : "overflow-auto"}`}
            >
                {children}
            </main>
        </div>
    );
}
