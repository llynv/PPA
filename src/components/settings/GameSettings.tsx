import { Settings, PlayCircle } from "lucide-react";
import { useGameStore } from "../../store/gameStore";

const BLIND_PRESETS = [
    { label: "5/10", smallBlind: 5, bigBlind: 10 },
    { label: "10/20", smallBlind: 10, bigBlind: 20 },
    { label: "25/50", smallBlind: 25, bigBlind: 50 },
    { label: "50/100", smallBlind: 50, bigBlind: 100 },
] as const;

const STACK_PRESETS = [500, 1000, 2000, 5000] as const;

const OPPONENT_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

const activeClass = "bg-emerald-600 text-white";
const inactiveClass = "bg-slate-700 text-slate-300 hover:bg-slate-600";
const buttonBase = "px-4 py-2 rounded-lg font-medium transition-colors";

export function GameSettings() {
    const settings = useGameStore((s) => s.settings);
    const updateSettings = useGameStore((s) => s.updateSettings);
    const startHand = useGameStore((s) => s.startHand);
    const processAITurns = useGameStore((s) => s.processAITurns);

    const selectedOpponents = settings.playerCount - 1;

    const handleStart = () => {
        startHand();
        processAITurns();
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
                                className={`${buttonBase} ${selectedOpponents === n ? activeClass : inactiveClass}`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <p className="text-slate-500 text-sm mt-1">
                        Total players: {settings.playerCount}
                    </p>
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
                                    }`}
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
                                    }`}
                            >
                                {stack.toLocaleString()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Start Button */}
                <button
                    onClick={handleStart}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg font-bold text-lg transition-colors flex items-center justify-center gap-2"
                >
                    <PlayCircle className="w-5 h-5" />
                    Deal Cards
                </button>
            </div>
        </div>
    );
}
