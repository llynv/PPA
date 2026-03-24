import { useState, useCallback, useMemo } from 'react';
import type { DrillSpot } from '../../types/drill';
import type { ActionType } from '../../types/poker';
import { useDrillStore } from '../../store/drillStore';
import { ActionButton } from '../game/ActionButton';

// ── Drill Action Controls ───────────────────────────────────────────
// Simplified action buttons for drill mode. Shows contextual actions
// based on whether hero is facing a raise or is first to act.

interface DrillActionControlsProps {
    spot: DrillSpot;
}

export function DrillActionControls({ spot }: DrillActionControlsProps) {
    const submitAnswer = useDrillStore((s) => s.submitAnswer);
    const { decisionContext } = spot;
    const { toCall, facingRaise, pot, stack: heroStack, bigBlind } = decisionContext;

    const isFacingBet = facingRaise || toCall > 0;

    // Raise/bet sizing bounds
    const minRaise = useMemo(() => {
        if (isFacingBet) {
            // Minimum raise is typically 2x the call amount, clamped to stack
            return Math.min(toCall * 2, heroStack);
        }
        // Minimum bet is 1 big blind
        return Math.min(bigBlind, heroStack);
    }, [isFacingBet, toCall, heroStack, bigBlind]);

    const maxRaise = heroStack;

    const [showSizer, setShowSizer] = useState(false);
    const [raiseAmount, setRaiseAmount] = useState(minRaise);

    const handleFold = useCallback(() => {
        submitAnswer('fold');
    }, [submitAnswer]);

    const handleCheck = useCallback(() => {
        submitAnswer('check');
    }, [submitAnswer]);

    const handleCall = useCallback(() => {
        submitAnswer('call');
    }, [submitAnswer]);

    const openSizer = useCallback(() => {
        setRaiseAmount(minRaise);
        setShowSizer(true);
    }, [minRaise]);

    const handleConfirmRaise = useCallback(() => {
        const action: ActionType = isFacingBet ? 'raise' : 'bet';
        submitAnswer(action, raiseAmount);
        setShowSizer(false);
    }, [isFacingBet, raiseAmount, submitAnswer]);

    const setPreset = useCallback(
        (fraction: number) => {
            const amount = Math.round(pot * fraction);
            setRaiseAmount(Math.max(minRaise, Math.min(maxRaise, amount)));
        },
        [pot, minRaise, maxRaise],
    );

    const raiseLabel = isFacingBet ? 'Raise' : 'Bet';
    const raisePotRatio = pot > 0 ? (raiseAmount / pot).toFixed(1) : null;

    return (
        <div className="w-full flex-shrink-0">
            {/* Raise/bet sizer panel */}
            {showSizer && (
                <div className="bg-neutral-900/95 border-t border-neutral-700 p-3 space-y-2">
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

                    <input
                        type="range"
                        min={minRaise}
                        max={maxRaise}
                        step={bigBlind}
                        value={raiseAmount}
                        onChange={(e) => setRaiseAmount(Number(e.target.value))}
                        aria-label={`${raiseLabel} amount slider`}
                        className="w-full accent-amber-500"
                    />

                    {/* Preset buttons */}
                    <div className="flex flex-wrap gap-2 justify-center">
                        {[
                            { label: '1/3 Pot', frac: 1 / 3 },
                            { label: '1/2 Pot', frac: 1 / 2 },
                            { label: '3/4 Pot', frac: 3 / 4 },
                            { label: 'Pot', frac: 1 },
                            { label: 'All In', frac: Infinity },
                        ].map(({ label, frac }) => (
                            <button
                                key={label}
                                onClick={() =>
                                    frac === Infinity
                                        ? setRaiseAmount(maxRaise)
                                        : setPreset(frac)
                                }
                                aria-label={`Set ${raiseLabel.toLowerCase()} to ${label}`}
                                className="bg-neutral-700 hover:bg-neutral-600 text-neutral-200 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={handleConfirmRaise}
                        aria-label={`Confirm ${raiseLabel} $${raiseAmount}`}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white py-2.5 px-4 rounded-md font-bold text-base transition-colors min-h-[48px]"
                    >
                        Confirm {raiseLabel} ${raiseAmount.toLocaleString()}
                    </button>
                </div>
            )}

            {/* Main action buttons */}
            <div className="flex justify-center gap-2 md:gap-3 px-4 py-3">
                {isFacingBet ? (
                    <>
                        <ActionButton
                            label="FOLD"
                            dotColor="bg-red-500"
                            onClick={handleFold}
                            ariaLabel="Fold your hand"
                        />
                        <ActionButton
                            label={`CALL $${toCall}`}
                            dotColor="bg-yellow-500"
                            onClick={handleCall}
                            ariaLabel={`Call $${toCall}`}
                        />
                        <ActionButton
                            label={`RAISE`}
                            dotColor="bg-amber-500"
                            onClick={openSizer}
                            ariaLabel="Open raise slider"
                        />
                    </>
                ) : (
                    <>
                        <ActionButton
                            label="CHECK"
                            dotColor="bg-yellow-500"
                            onClick={handleCheck}
                            ariaLabel="Check"
                        />
                        <ActionButton
                            label="BET"
                            dotColor="bg-amber-500"
                            onClick={openSizer}
                            ariaLabel="Open bet slider"
                        />
                    </>
                )}
            </div>
        </div>
    );
}
