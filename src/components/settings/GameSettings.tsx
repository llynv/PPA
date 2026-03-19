import { Settings, PlayCircle } from "lucide-react";
import { useGameStore } from "../../store/gameStore";

const BLIND_PRESETS = [
    { label: "5/10", smallBlind: 5, bigBlind: 10 },
    { label: "10/20", smallBlind: 10, bigBlind: 20 },
    { label: "25/50", smallBlind: 25, bigBlind: 50 },
    { label: "50/100", smallBlind: 50, bigBlind: 100 },
] as const;

const STACK_PRESETS = [500, 1000, 2000, 5000] as const;

const OPPONENT_COUNTS = [1, 2, 3, 4, 5] as const;

const activeClass = "bg-emerald-600 text-white";
const inactiveClass = "bg-slate-700 text-slate-300 hover:bg-slate-600";
const buttonBase = "px-4 py-2 rounded-lg font-medium transition-colors";

export function GameSettings() {
    const settings = useGameStore((s) => s.settings);
    const updateSettings = useGameStore((s) => s.updateSettings);
    const startHand = useGameStore((s) => s.startHand);
    const processAITurns = useGameStore((s) => s.processAITurns);
    const trainingMode = useGameStore((s) => s.trainingMode);
    const setTrainingMode = useGameStore((s) => s.setTrainingMode);

    const selectedOpponents = settings.playerCount - 1;

    const handleStart = () => {
        startHand();
        void processAITurns();
    };

    return (
        <div className="max-w-md mx-auto mt-12 px-4">
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                {/* Title */}
                <div className="flex items-center gap-3 mb-6">
                    <Settings className="w-6 h-6 text-emerald-400" />
                    <h1 className="text-2xl font-bold text-white">
                        Game Settings
                    </h1>
                </div>

                {/* Opponents */}
                <div className="mb-6">
                    <label className="block text-slate-300 font-medium mb-2">
                        Opponents
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {OPPONENT_COUNTS.map((n) => (
                            <button
                                key={n}
                                onClick={() =>
                                    updateSettings({ playerCount: n + 1 })
                                }
                                className={`${buttonBase} ${selectedOpponents === n ? activeClass : inactiveClass} focus-visible:ring-2 focus-visible:ring-emerald-400`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <p className="text-slate-500 text-sm mt-1">
                        Total players: {settings.playerCount}
                    </p>
                    <div className="mt-2 space-y-1">
                        <p className="text-slate-500 text-xs">
                            AI personalities are randomly assigned:
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            <span className="text-slate-500 text-xs" title="Tight-Aggressive: plays few hands but bets aggressively">
                                <strong className="text-slate-400">TAG</strong> = Tight-Aggressive
                            </span>
                            <span className="text-slate-500 text-xs" title="Loose-Aggressive: plays many hands and bets aggressively">
                                <strong className="text-slate-400">LAG</strong> = Loose-Aggressive
                            </span>
                            <span className="text-slate-500 text-xs" title="Tight-Passive: plays few hands and rarely raises">
                                <strong className="text-slate-400">TP</strong> = Tight-Passive
                            </span>
                            <span className="text-slate-500 text-xs" title="Loose-Passive: plays many hands but rarely raises">
                                <strong className="text-slate-400">LP</strong> = Loose-Passive
                            </span>
                        </div>
                    </div>
                </div>

                {/* Blinds */}
                <div className="mb-6">
                    <label className="block text-slate-300 font-medium mb-2">
                        Blinds
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {BLIND_PRESETS.map((preset) => (
                            <button
                                key={preset.label}
                                onClick={() =>
                                    updateSettings({
                                        smallBlind: preset.smallBlind,
                                        bigBlind: preset.bigBlind,
                                    })
                                }
                                className={`${buttonBase} ${settings.smallBlind === preset.smallBlind &&
                                    settings.bigBlind === preset.bigBlind
                                    ? activeClass
                                    : inactiveClass
                                    } focus-visible:ring-2 focus-visible:ring-emerald-400`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Starting Stack */}
                <div className="mb-8">
                    <label className="block text-slate-300 font-medium mb-2">
                        Starting Stack
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {STACK_PRESETS.map((stack) => (
                            <button
                                key={stack}
                                onClick={() =>
                                    updateSettings({ startingStack: stack })
                                }
                                className={`${buttonBase} ${settings.startingStack === stack
                                    ? activeClass
                                    : inactiveClass
                                    } focus-visible:ring-2 focus-visible:ring-emerald-400`}
                            >
                                {stack.toLocaleString()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Training Mode */}
                <div className="mb-8">
                    <label className="block text-slate-300 font-medium mb-2">
                        Training Mode
                    </label>
                    <div className="flex items-center justify-between bg-slate-700 rounded-lg p-3">
                        <div>
                            <p className="text-slate-200 text-sm font-medium">
                                Show Hints
                            </p>
                            <p className="text-slate-400 text-xs">
                                Get GTO-based hints during your turn
                            </p>
                        </div>
                        <button
                            role="switch"
                            aria-checked={trainingMode}
                            onClick={() => setTrainingMode(!trainingMode)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                                trainingMode ? "bg-emerald-600" : "bg-slate-600"
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    trainingMode ? "translate-x-6" : "translate-x-1"
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Start Button */}
                <button
                    onClick={handleStart}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                    <PlayCircle className="w-5 h-5" />
                    Deal Cards
                </button>
            </div>
        </div>
    );
}
