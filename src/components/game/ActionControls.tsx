import { useState, useCallback, useMemo } from "react";
import { useGameStore } from "../../store/gameStore";

export function ActionControls() {
    const players = useGameStore((s) => s.players);
    const activePlayerIndex = useGameStore((s) => s.activePlayerIndex);
    const pot = useGameStore((s) => s.pot);
    const settings = useGameStore((s) => s.settings);
    const performAction = useGameStore((s) => s.performAction);
    const processAITurns = useGameStore((s) => s.processAITurns);
    const isProcessingAI = useGameStore((s) => s.isProcessingAI);

    const heroPlayer = players.find((p) => p.isHero);
    const activePlayer = players[activePlayerIndex];
    const isHeroTurn = activePlayer?.isHero === true;

    // Current highest bet on the table
    const currentMaxBet = useMemo(
        () => Math.max(0, ...players.map((p) => p.currentBet)),
        [players],
    );

    const currentBetToCall = heroPlayer
        ? currentMaxBet - heroPlayer.currentBet
        : 0;
    const canCheck = currentBetToCall <= 0;
    const heroStack = heroPlayer?.stack ?? 0;

    // The total amount hero would need to commit for a raise
    // minRaise represents the minimum total bet (not additional chips)
    const minRaiseTotal = Math.max(
        currentMaxBet + settings.bigBlind,
        currentMaxBet * 2,
    );
    const maxRaiseTotal = heroStack + (heroPlayer?.currentBet ?? 0);

    const [showRaiseSlider, setShowRaiseSlider] = useState(false);
    const [raiseAmount, setRaiseAmount] = useState(minRaiseTotal);

    // Reset slider when it opens
    const openRaiseSlider = useCallback(() => {
        setRaiseAmount(minRaiseTotal);
        setShowRaiseSlider(true);
    }, [minRaiseTotal]);

    const handleFold = useCallback(() => {
        performAction("fold");
        setShowRaiseSlider(false);
        void processAITurns();
    }, [performAction, processAITurns]);

    const handleCheckCall = useCallback(() => {
        if (canCheck) {
            performAction("check");
        } else {
            performAction("call");
        }
        setShowRaiseSlider(false);
        void processAITurns();
    }, [canCheck, performAction, processAITurns]);

    const handleRaise = useCallback(() => {
        const actionType = currentMaxBet > 0 ? "raise" : "bet";
        performAction(actionType, raiseAmount);
        setShowRaiseSlider(false);
        void processAITurns();
    }, [currentMaxBet, raiseAmount, performAction, processAITurns]);

    const setPresetRaise = useCallback(
        (fraction: number) => {
            const amount = Math.round(pot * fraction);
            const clamped = Math.max(
                minRaiseTotal,
                Math.min(maxRaiseTotal, amount),
            );
            setRaiseAmount(clamped);
        },
        [pot, minRaiseTotal, maxRaiseTotal],
    );

    // Don't render if it's not hero's turn or AI is processing
    if (!isHeroTurn || !heroPlayer || isProcessingAI) return null;

    const raiseLabel = currentMaxBet > 0 ? "Raise" : "Bet";

    // Pot odds percentage for call button label
    const callPotPct =
        !canCheck && pot > 0
            ? Math.round((currentBetToCall / pot) * 100)
            : null;

    // Bet-to-pot ratio for raise slider
    const raisePotRatio =
        pot > 0 ? (raiseAmount / pot).toFixed(1) : null;

    return (
        <div className="w-full bg-slate-900 border-t border-slate-700 p-3 pb-[env(safe-area-inset-bottom,12px)] flex-shrink-0">
            {/* Raise slider panel */}
            {showRaiseSlider && (
                <div className="mb-4 space-y-3">
                    <div className="text-center">
                        <span className="text-white font-bold text-lg">
                            {raiseLabel}: ${raiseAmount.toLocaleString()}
                        </span>
                        {raisePotRatio && (
                            <span className="text-slate-400 text-sm ml-2">
                                ({raisePotRatio}x pot)
                            </span>
                        )}
                    </div>

                    {/* Slider */}
                    <input
                        type="range"
                        min={minRaiseTotal}
                        max={maxRaiseTotal}
                        step={settings.bigBlind}
                        value={raiseAmount}
                        onChange={(e) => setRaiseAmount(Number(e.target.value))}
                        aria-label="Raise amount slider"
                        className="w-full accent-amber-500 focus-visible:ring-2 focus-visible:ring-emerald-400"
                    />

                    {/* Preset buttons */}
                    <div className="flex flex-wrap gap-2 justify-center">
                        <PresetButton
                            label="1/3 Pot"
                            onClick={() => setPresetRaise(1 / 3)}
                        />
                        <PresetButton
                            label="1/2 Pot"
                            onClick={() => setPresetRaise(1 / 2)}
                        />
                        <PresetButton
                            label="3/4 Pot"
                            onClick={() => setPresetRaise(3 / 4)}
                        />
                        <PresetButton
                            label="Pot"
                            onClick={() => setPresetRaise(1)}
                        />
                        <PresetButton
                            label="All In"
                            onClick={() => setRaiseAmount(maxRaiseTotal)}
                        />
                    </div>

                    {/* Confirm raise */}
                    <button
                        onClick={handleRaise}
                        aria-label={`Confirm ${raiseLabel} $${raiseAmount}`}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 px-6 rounded-lg font-bold text-lg transition-colors min-h-[48px] focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                        Confirm {raiseLabel} ${raiseAmount.toLocaleString()}
                    </button>
                </div>
            )}

            {/* Main action buttons */}
            <div className="grid grid-cols-3 gap-3 md:flex md:justify-center md:gap-4">
                <button
                    onClick={handleFold}
                    aria-label="Fold your hand"
                    className="bg-red-600 hover:bg-red-500 text-white py-3 px-6 rounded-lg font-bold text-lg transition-colors min-h-[48px] focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                    Fold
                </button>

                <button
                    onClick={handleCheckCall}
                    aria-label={canCheck ? "Check" : `Call $${currentBetToCall}`}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-6 rounded-lg font-bold text-lg transition-colors min-h-[48px] focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                    {canCheck ? (
                        "Check"
                    ) : (
                        <span>
                            Call ${currentBetToCall.toLocaleString()}
                            {callPotPct != null && (
                                <span className="text-emerald-200 text-xs font-normal ml-1">
                                    ({callPotPct}%)
                                </span>
                            )}
                        </span>
                    )}
                </button>

                <button
                    onClick={openRaiseSlider}
                    aria-label={`${raiseLabel} - open raise slider`}
                    className="bg-amber-600 hover:bg-amber-500 text-white py-3 px-6 rounded-lg font-bold text-lg transition-colors min-h-[48px] focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                    {raiseLabel}
                </button>
            </div>
        </div>
    );
}

// ── Preset Button ───────────────────────────────────────────────────

function PresetButton({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            aria-label={`Set raise to ${label}`}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
            {label}
        </button>
    );
}
