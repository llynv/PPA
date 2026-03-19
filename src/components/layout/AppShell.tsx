import { useGameStore } from "../../store/gameStore";
import { useIsLandscape } from "../game/PlayerSeat";

interface AppShellProps {
    children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
    const gamePhase = useGameStore((s) => s.gamePhase);
    const handNumber = useGameStore((s) => s.handNumber);
    const resetGame = useGameStore((s) => s.resetGame);
    const isLandscape = useIsLandscape();

    const isGameView = gamePhase === "playing" || gamePhase === "showdown";

    // Portrait game: lock to viewport, no scroll
    // Landscape game: original scrollable layout
    const shellClass = isGameView && !isLandscape
        ? "h-dvh overflow-hidden"
        : "min-h-dvh";

    return (
        <div
            className={`flex flex-col bg-slate-900 text-slate-100 ${shellClass}`}
        >
            <nav className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex flex-row items-center justify-between flex-shrink-0">
                <span className="text-emerald-400 font-bold text-lg">PPA</span>

                {gamePhase !== "settings" && (
                    <div className="flex items-center gap-4">
                        <span className="text-slate-300 text-sm">
                            Hand #{handNumber}
                        </span>
                        <button
                            onClick={resetGame}
                            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                            New Game
                        </button>
                    </div>
                )}
            </nav>

            <main
                className={`flex-1 ${isGameView && !isLandscape ? "min-h-0" : "overflow-auto"}`}
            >
                {children}
            </main>
        </div>
    );
}
