import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useGameStore } from "../../store/gameStore";
import { PRODUCT_NAV_ITEMS } from "./productNav";

export function AppShell() {
    const location = useLocation();
    const navigate = useNavigate();
    const gamePhase = useGameStore((s) => s.gamePhase);
    const handNumber = useGameStore((s) => s.handNumber);
    const resetGame = useGameStore((s) => s.resetGame);

    const isPracticeRoute = location.pathname === "/practice";
    const isReviewRoute = location.pathname === "/review";
    const showSessionControls =
        (isPracticeRoute || isReviewRoute) && handNumber > 0;
    const isGameView =
        isPracticeRoute && (gamePhase === "playing" || gamePhase === "showdown");

    const handleNewGame = () => {
        resetGame();

        if (isReviewRoute) {
            navigate("/practice");
        }
    };

    return (
        <div
            className="flex flex-col bg-neutral-950 text-neutral-100 h-dvh overflow-hidden"
        >
            <nav className="bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex flex-col gap-3 flex-shrink-0 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <span className="text-emerald-400 font-bold text-lg">PPA</span>
                        <p className="text-xs text-neutral-500">
                            Learning-first coach
                        </p>
                    </div>

                    {showSessionControls && (
                        <div className="flex items-center gap-3 md:hidden">
                            <span className="text-neutral-400 text-sm">
                                Hand #{handNumber}
                            </span>
                            <button
                                onClick={handleNewGame}
                                className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors border border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-400"
                            >
                                New Game
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap" aria-label="Primary product navigation">
                        {PRODUCT_NAV_ITEMS.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) =>
                                    `px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                        isActive
                                            ? "bg-emerald-600 text-white border-emerald-500"
                                            : "bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800 hover:text-white"
                                    }`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </div>

                    {showSessionControls && (
                        <div className="hidden md:flex items-center gap-4">
                            {isReviewRoute && gamePhase === "analysis" && (
                                <span className="text-emerald-400 text-sm font-medium">
                                    Review ready
                                </span>
                            )}
                            <span className="text-neutral-400 text-sm">
                                Hand #{handNumber}
                            </span>
                        <button
                            onClick={handleNewGame}
                            className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors border border-neutral-700 focus-visible:ring-2 focus-visible:ring-emerald-400"
                        >
                            New Game
                        </button>
                        </div>
                    )}
                </div>
            </nav>

            <main
                className={`flex-1 min-h-0 ${isGameView ? "" : "overflow-auto"}`}
            >
                <Outlet />
            </main>
        </div>
    );
}
