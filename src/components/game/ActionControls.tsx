import { useState, useCallback, useMemo } from "react";
import { useGameStore } from "../../store/gameStore";
import { ActionButton } from "./ActionButton";

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

    const handleAllIn = useCallback(() => {
        const actionType = currentMaxBet > 0 ? "raise" : "bet";
        performAction(actionType, maxRaiseTotal);
        setShowRaiseSlider(false);
        void processAITurns();
    }, [currentMaxBet, maxRaiseTotal, performAction, processAITurns]);

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

    // Bet-to-pot ratio for raise slider
    const raisePotRatio = pot > 0 ? (raiseAmount / pot).toFixed(1) : null;

    // Default raise-to amount for the button label
    const defaultRaiseTo = minRaiseTotal;

    return (
        <div className="w-full flex-shrink-0 pb-[env(safe-area-inset-bottom,8px)]">
            {/* Raise slider panel */}
            {showRaiseSlider && (
                <div className="bg-neutral-900/95 border-t border-neutral-700 p-4 space-y-3">
                    <div className="text-center">
                        <span className="text-white font-bold text-lg">
                            {raiseLabel}: ${raiseAmount.toLocaleString()}
                        </span>
                        {raisePotRatio && (
                            <span className="text-neutral-400 text-sm ml-2">
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
                        className="w-full accent-blue-500 focus-visible:ring-2 focus-visible:ring-emerald-400"
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
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 px-6 rounded-md font-bold text-lg transition-colors min-h-[48px] focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                        Confirm {raiseLabel} ${raiseAmount.toLocaleString()}
                    </button>
                </div>
            )}

            {/* Main action buttons bar */}
            <div className="flex items-center justify-center gap-2 md:gap-3 px-4 py-3">
                <ActionButton
                    label="FOLD"
                    dotColor="bg-red-500"
                    onClick={handleFold}
                    ariaLabel="Fold your hand"
                />

                <ActionButton
                    label={
                        canCheck
                            ? "CHECK"
                            : `CALL ${currentBetToCall.toFixed(2)}`
                    }
                    dotColor="bg-yellow-500"
                    onClick={handleCheckCall}
                    ariaLabel={
                        canCheck ? "Check" : `Call $${currentBetToCall}`
                    }
                />

                <ActionButton
                    label={`RAISE TO ${defaultRaiseTo.toFixed(2)}`}
                    dotColor="bg-blue-500"
                    onClick={openRaiseSlider}
                    ariaLabel={`${raiseLabel} - open raise slider`}
                />

                <ActionButton
                    label="ALL IN"
                    dotColor="bg-cyan-600"
                    onClick={handleAllIn}
                    ariaLabel={`All in for $${maxRaiseTotal}`}
                />
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
            className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
            {label}
        </button>
    );
}
