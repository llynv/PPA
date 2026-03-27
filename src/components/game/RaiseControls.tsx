import { useCallback } from "react";

interface RaiseControlsProps {
    raiseLabel: string;
    raiseAmount: number;
    raisePotRatio: string | null;
    minRaiseTotal: number;
    maxRaiseTotal: number;
    bigBlind: number;
    pot: number;
    onRaiseAmountChange: (amount: number) => void;
    onConfirmRaise: () => void;
}

function PresetChip({
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
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[var(--sd-brass)]"
            style={{
                background: "var(--sd-rail)",
                color: "var(--sd-ivory)",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--sd-rail-highlight)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--sd-rail)";
            }}
        >
            {label}
        </button>
    );
}

export function RaiseControls({
    raiseLabel,
    raiseAmount,
    raisePotRatio,
    minRaiseTotal,
    maxRaiseTotal,
    bigBlind,
    pot,
    onRaiseAmountChange,
    onConfirmRaise,
}: RaiseControlsProps) {
    const setPresetRaise = useCallback(
        (fraction: number) => {
            const amount = Math.round(pot * fraction);
            const clamped = Math.max(
                minRaiseTotal,
                Math.min(maxRaiseTotal, amount),
            );
            onRaiseAmountChange(clamped);
        },
        [pot, minRaiseTotal, maxRaiseTotal, onRaiseAmountChange],
    );

    return (
        <div
            className="p-3 md:p-4 space-y-2 md:space-y-3"
            style={{
                background: "var(--sd-surface)",
                borderBottom: "1px solid var(--sd-smoke)",
            }}
            data-testid="raise-controls"
        >
            {/* Raise amount display */}
            <div className="text-center">
                <span
                    className="font-bold text-lg"
                    style={{
                        fontFamily: "var(--sd-font-mono)",
                        color: "var(--sd-ivory)",
                    }}
                >
                    {raiseLabel}: ${raiseAmount.toLocaleString()}
                </span>
                {raisePotRatio && (
                    <span
                        className="text-sm ml-2"
                        style={{ color: "var(--sd-brass-muted)" }}
                    >
                        ({raisePotRatio}x pot)
                    </span>
                )}
            </div>

            {/* Slider */}
            <input
                type="range"
                min={minRaiseTotal}
                max={maxRaiseTotal}
                step={bigBlind}
                value={raiseAmount}
                onChange={(e) => onRaiseAmountChange(Number(e.target.value))}
                aria-label="Raise amount slider"
                className="w-full accent-[var(--sd-raise)] focus-visible:ring-2 focus-visible:ring-[var(--sd-brass)]"
            />

            {/* Preset chips */}
            <div className="flex flex-wrap gap-2 justify-center">
                <PresetChip label="1/3 Pot" onClick={() => setPresetRaise(1 / 3)} />
                <PresetChip label="1/2 Pot" onClick={() => setPresetRaise(1 / 2)} />
                <PresetChip label="3/4 Pot" onClick={() => setPresetRaise(3 / 4)} />
                <PresetChip label="Pot" onClick={() => setPresetRaise(1)} />
                <PresetChip
                    label="All-in"
                    onClick={() => onRaiseAmountChange(maxRaiseTotal)}
                />
            </div>

            {/* Confirm raise button */}
            <button
                onClick={onConfirmRaise}
                aria-label={`Confirm ${raiseLabel} $${raiseAmount}`}
                className="w-full py-2.5 px-4 md:py-3 md:px-6 rounded-md font-bold text-base md:text-lg transition-colors min-h-[48px] focus-visible:ring-2 focus-visible:ring-[var(--sd-brass)] text-white"
                style={{
                    background: "var(--sd-raise)",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.filter = "brightness(1.15)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.filter = "";
                }}
            >
                Confirm {raiseLabel} ${raiseAmount.toLocaleString()}
            </button>
        </div>
    );
}
