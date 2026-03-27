import { useState, useCallback, useMemo } from "react";
import { useGameStore } from "../../store/gameStore";
import { RaiseControls } from "./RaiseControls";

const DOCK_BTN =
    "px-3 py-2 md:px-5 md:py-3 rounded-md font-bold text-[11px] md:text-sm uppercase tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-[var(--sd-brass)] min-h-[40px] md:min-h-[44px]";

export function HeroDock() {
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

    const currentMaxBet = useMemo(
        () => Math.max(0, ...players.map((p) => p.currentBet)),
        [players],
    );

    const currentBetToCall = heroPlayer
        ? currentMaxBet - heroPlayer.currentBet
        : 0;
    const canCheck = currentBetToCall <= 0;
    const heroStack = heroPlayer?.stack ?? 0;

    const minRaiseTotal = Math.max(
        currentMaxBet + settings.bigBlind,
        currentMaxBet * 2,
    );
    const maxRaiseTotal = heroStack + (heroPlayer?.currentBet ?? 0);

    const [showRaiseSlider, setShowRaiseSlider] = useState(false);
    const [raiseAmount, setRaiseAmount] = useState(minRaiseTotal);

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

    // Guard: not hero turn
    if (!isHeroTurn || !heroPlayer || isProcessingAI) return null;

    const raiseLabel = currentMaxBet > 0 ? "Raise" : "Bet";
    const raisePotRatio = pot > 0 ? (raiseAmount / pot).toFixed(1) : null;

    return (
        <div
            className="shrink-0 w-full"
            style={{
                background: "var(--sd-surface)",
                borderTop: "1px solid var(--sd-smoke)",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
            data-testid="hero-dock"
            onKeyDown={(e) => {
                if (e.key === "Escape") setShowRaiseSlider(false);
            }}
        >
            {/* RaiseControls panel — inline above action buttons */}
            {showRaiseSlider && (
                <RaiseControls
                    raiseLabel={raiseLabel}
                    raiseAmount={raiseAmount}
                    raisePotRatio={raisePotRatio}
                    minRaiseTotal={minRaiseTotal}
                    maxRaiseTotal={maxRaiseTotal}
                    bigBlind={settings.bigBlind}
                    pot={pot}
                    onRaiseAmountChange={setRaiseAmount}
                    onConfirmRaise={handleRaise}
                />
            )}

            {/* Action buttons bar */}
            <div className="flex items-center justify-center gap-2 md:gap-3 w-full max-w-[600px] mx-auto px-4 py-3">
                {/* Fold — outline style */}
                <button
                    onClick={handleFold}
                    aria-label="Fold your hand"
                    className={`${DOCK_BTN} bg-transparent`}
                    style={{
                        border: "1.5px solid var(--sd-fold)",
                        color: "var(--sd-fold)",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--sd-fold)";
                        e.currentTarget.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--sd-fold)";
                    }}
                >
                    Fold
                </button>

                {/* Check/Call — filled green, safe default */}
                <button
                    onClick={handleCheckCall}
                    aria-label={canCheck ? "Check" : `Call $${currentBetToCall}`}
                    className={`${DOCK_BTN} text-white`}
                    style={{
                        background: "var(--sd-check)",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.filter = "brightness(1.15)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.filter = "";
                    }}
                >
                    {canCheck ? "CHECK" : `CALL $${currentBetToCall}`} ✓
                </button>

                {/* Raise — filled blue, prominent */}
                <button
                    onClick={openRaiseSlider}
                    aria-label={`${raiseLabel} - open raise slider`}
                    className={`${DOCK_BTN} text-white`}
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
                    {raiseLabel} ▸
                </button>

                {/* All-in — outline orange, dramatic but not default */}
                <button
                    onClick={handleAllIn}
                    aria-label={`All in for $${maxRaiseTotal}`}
                    className={`${DOCK_BTN} bg-transparent`}
                    style={{
                        border: "1.5px solid var(--sd-allin)",
                        color: "var(--sd-allin)",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--sd-allin)";
                        e.currentTarget.style.color = "white";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--sd-allin)";
                    }}
                >
                    All-in
                </button>
            </div>
        </div>
    );
}
