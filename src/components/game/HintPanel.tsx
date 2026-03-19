import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { evaluateDecision, getPosition } from "../../lib/poker-engine";
import type { DecisionResult } from "../../types/poker";

export function HintPanel() {
    const trainingMode = useGameStore((s) => s.trainingMode);
    const players = useGameStore((s) => s.players);
    const activePlayerIndex = useGameStore((s) => s.activePlayerIndex);
    const communityCards = useGameStore((s) => s.communityCards);
    const pot = useGameStore((s) => s.pot);
    const currentRound = useGameStore((s) => s.currentRound);
    const actions = useGameStore((s) => s.actions);
    const dealerIndex = useGameStore((s) => s.dealerIndex);
    const settings = useGameStore((s) => s.settings);
    const gamePhase = useGameStore((s) => s.gamePhase);
    const isProcessingAI = useGameStore((s) => s.isProcessingAI);

    const [result, setResult] = useState<DecisionResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const activePlayer = players[activePlayerIndex];
    const isHeroTurn = activePlayer?.isHero === true;
    const heroPlayer = players.find((p) => p.isHero);

    const shouldShow =
        trainingMode &&
        isHeroTurn &&
        gamePhase === "playing" &&
        !isProcessingAI &&
        heroPlayer;

    const handleShowHint = useCallback(() => {
        if (!heroPlayer || !isHeroTurn) return;

        setIsLoading(true);
        setIsOpen(true);

        // Use requestAnimationFrame + setTimeout to let the loading state render
        requestAnimationFrame(() => {
            setTimeout(() => {
                const currentMaxBet = Math.max(
                    0,
                    ...players.map((p) => p.currentBet),
                );
                const toCall = currentMaxBet - heroPlayer.currentBet;
                const heroIndex = players.findIndex((p) => p.isHero);
                const position = getPosition(
                    heroIndex,
                    dealerIndex,
                    players.length,
                );

                // Check if hero is first to act this round
                const roundActions = actions.filter(
                    (a) => a.round === currentRound,
                );
                const isFirstToAct = roundActions.length === 0;

                // Check if facing a raise
                const lastNonCheckAction = [...roundActions]
                    .reverse()
                    .find(
                        (a) =>
                            a.playerId !== heroPlayer.id &&
                            a.type !== "check" &&
                            a.type !== "fold",
                    );
                const facingRaise =
                    lastNonCheckAction?.type === "raise" ||
                    lastNonCheckAction?.type === "bet";

                // Find raiser position if applicable
                let raiserPosition;
                if (facingRaise && lastNonCheckAction) {
                    const raiserIdx = players.findIndex(
                        (p) => p.id === lastNonCheckAction.playerId,
                    );
                    if (raiserIdx >= 0) {
                        raiserPosition = getPosition(
                            raiserIdx,
                            dealerIndex,
                            players.length,
                        );
                    }
                }

                const activePlayers = players.filter((p) => !p.isFolded);
                const nonFoldedNonAllIn = activePlayers.filter(
                    (p) => !p.isAllIn,
                );

                const decisionResult = evaluateDecision({
                    holeCards: heroPlayer.holeCards,
                    communityCards,
                    position,
                    round: currentRound,
                    pot,
                    toCall,
                    currentBet: currentMaxBet,
                    stack: heroPlayer.stack,
                    bigBlind: settings.bigBlind,
                    numActivePlayers: nonFoldedNonAllIn.length,
                    numPlayersInHand: activePlayers.length,
                    isFirstToAct,
                    facingRaise,
                    raiserPosition,
                    actionHistory: [...actions],
                });

                setResult(decisionResult);
                setIsLoading(false);
            }, 10);
        });
    }, [
        heroPlayer,
        isHeroTurn,
        players,
        communityCards,
        pot,
        currentRound,
        actions,
        dealerIndex,
        settings.bigBlind,
    ]);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setResult(null);
    }, []);

    if (!shouldShow) return null;

    return (
        <div className="w-full">
            {/* Show Hint button */}
            {!isOpen && (
                <div className="flex justify-center pb-1">
                    <button
                        onClick={handleShowHint}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                        Show Hint
                    </button>
                </div>
            )}

            {/* Slide-up hint panel */}
            {isOpen && (
                <div className="bg-slate-800 border-t border-blue-500/50 p-3 animate-in slide-in-from-bottom duration-200">
                    <div className="flex items-start justify-between mb-2">
                        <h3 className="text-blue-400 font-bold text-sm">
                            GTO Hint
                        </h3>
                        <button
                            onClick={handleClose}
                            className="text-slate-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
                            aria-label="Close hint panel"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center gap-2 py-2">
                            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-slate-300 text-sm">
                                Calculating...
                            </span>
                        </div>
                    ) : result ? (
                        <div className="space-y-2">
                            {/* Recommended action */}
                            <div className="flex items-center gap-2">
                                <span className="text-white font-bold text-sm">
                                    {result.optimalAction === "fold"
                                        ? "Fold"
                                        : result.optimalAction === "check"
                                          ? "Check"
                                          : result.optimalAction === "call"
                                            ? "Call"
                                            : result.optimalAmount
                                              ? `${result.optimalAction === "raise" ? "Raise" : "Bet"} to $${result.optimalAmount.toLocaleString()}`
                                              : result.optimalAction === "raise"
                                                ? "Raise"
                                                : "Bet"}
                                </span>
                            </div>

                            {/* Equity */}
                            <div className="flex items-center gap-3 text-xs">
                                <span className="text-slate-400">
                                    Equity:{" "}
                                    <span className="text-emerald-400 font-medium">
                                        {Math.round(result.equity * 100)}%
                                    </span>
                                </span>
                                {result.potOdds > 0 && (
                                    <span className="text-slate-400">
                                        Pot Odds:{" "}
                                        <span className="text-amber-400 font-medium">
                                            {Math.round(
                                                result.potOdds * 100,
                                            )}
                                            %
                                        </span>
                                    </span>
                                )}
                            </div>

                            {/* Reasoning */}
                            <p className="text-slate-300 text-xs leading-relaxed">
                                {result.reasoning}
                            </p>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
