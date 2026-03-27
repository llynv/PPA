import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { useGameStore } from "../../store/gameStore";
import { evaluateDecision, getPosition } from "../../lib/poker-engine";
import type { DecisionResult } from "../../types/poker";

// ── Pot-Odds / SPR Badge (logic from TableHUD) ─────────────────────

function CoachBadges() {
    const players = useGameStore((s) => s.players);
    const pot = useGameStore((s) => s.pot);
    const currentRound = useGameStore((s) => s.currentRound);
    const activePlayerIndex = useGameStore((s) => s.activePlayerIndex);

    const heroPlayer = players.find((p) => p.isHero);
    const activePlayer = players[activePlayerIndex];
    const isHeroTurn = activePlayer?.isHero === true;

    if (!heroPlayer) return null;

    const currentMaxBet = Math.max(0, ...players.map((p) => p.currentBet));
    const callAmount = currentMaxBet - (heroPlayer.currentBet ?? 0);
    const heroFacingBet = isHeroTurn && callAmount > 0;

    const potOddsRatio =
        heroFacingBet && callAmount > 0
            ? (pot + callAmount) / callAmount
            : null;
    const potOddsPct =
        heroFacingBet && callAmount > 0
            ? Math.round((callAmount / (pot + callAmount)) * 100)
            : null;

    const showSPR = currentRound !== "preflop" && pot > 0;
    const spr = showSPR ? heroPlayer.stack / pot : null;

    const hasBadges = potOddsRatio != null || spr != null;
    if (!hasBadges) return null;

    return (
        <div className="space-y-2">
            {potOddsRatio != null && potOddsPct != null && (
                <div
                    className="rounded-lg px-3 py-2"
                    style={{ background: "var(--sd-smoke)" }}
                >
                    <p
                        className="text-xs font-medium"
                        style={{
                            color: "var(--sd-brass-muted)",
                            fontFamily: "var(--sd-font-mono)",
                        }}
                    >
                        Pot Odds
                    </p>
                    <p
                        aria-label={`Pot odds: ${potOddsRatio.toFixed(1)} to 1, ${potOddsPct}%`}
                        className="text-sm font-bold"
                        style={{ color: "var(--sd-ivory)" }}
                    >
                        {potOddsRatio.toFixed(1)}:1{" "}
                        <span className="font-normal opacity-70">
                            ({potOddsPct}%)
                        </span>
                    </p>
                </div>
            )}
            {spr != null && (
                <div
                    className="rounded-lg px-3 py-2"
                    style={{ background: "var(--sd-smoke)" }}
                >
                    <p
                        className="text-xs font-medium"
                        style={{
                            color: "var(--sd-brass-muted)",
                            fontFamily: "var(--sd-font-mono)",
                        }}
                    >
                        SPR
                    </p>
                    <p
                        aria-label={`Stack to pot ratio: ${spr.toFixed(1)}`}
                        className="text-sm font-bold"
                        style={{ color: "var(--sd-ivory)" }}
                    >
                        {spr.toFixed(1)}
                    </p>
                </div>
            )}
        </div>
    );
}

// ── Hint Section (logic from HintPanel) ─────────────────────────────

function CoachHint() {
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
        isHeroTurn &&
        gamePhase === "playing" &&
        !isProcessingAI &&
        heroPlayer;

    const handleShowHint = useCallback(() => {
        if (!heroPlayer || !isHeroTurn) return;

        setIsLoading(true);
        setIsOpen(true);

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

                const roundActions = actions.filter(
                    (a) => a.round === currentRound,
                );
                const isFirstToAct = roundActions.length === 0;

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
        <div className="space-y-2">
            {!isOpen && (
                <button
                    onClick={handleShowHint}
                    className="w-full rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--sd-brass)]"
                    style={{
                        background: "var(--sd-raise)",
                        color: "var(--sd-ivory)",
                    }}
                    aria-label="Show coaching hint"
                >
                    Show Hint
                </button>
            )}

            {isOpen && (
                <div
                    className="rounded-lg px-3 py-3"
                    style={{
                        background: "var(--sd-smoke)",
                        borderLeft: "2px solid var(--sd-brass)",
                    }}
                >
                    <div className="flex items-start justify-between mb-2">
                        <h3
                            className="font-bold text-sm"
                            style={{ color: "var(--sd-brass)" }}
                        >
                            GTO Hint
                        </h3>
                        <button
                            onClick={handleClose}
                            className="opacity-60 hover:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--sd-brass)]"
                            style={{ color: "var(--sd-ivory)" }}
                            aria-label="Close hint panel"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center gap-2 py-2">
                            <div
                                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                style={{ borderColor: "var(--sd-brass)", borderTopColor: "transparent" }}
                            />
                            <span
                                className="text-sm"
                                style={{ color: "var(--sd-ivory)", opacity: 0.7 }}
                            >
                                Calculating...
                            </span>
                        </div>
                    ) : result ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span
                                    className="font-bold text-sm"
                                    style={{ color: "var(--sd-ivory)" }}
                                >
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

                            <div className="flex items-center gap-3 text-xs">
                                <span style={{ color: "var(--sd-ivory)", opacity: 0.6 }}>
                                    Equity:{" "}
                                    <span
                                        className="font-medium"
                                        style={{ color: "var(--sd-check)", opacity: 1 }}
                                    >
                                        {Math.round(result.equity * 100)}%
                                    </span>
                                </span>
                                {result.potOdds > 0 && (
                                    <span style={{ color: "var(--sd-ivory)", opacity: 0.6 }}>
                                        Pot Odds:{" "}
                                        <span
                                            className="font-medium"
                                            style={{ color: "var(--sd-brass)", opacity: 1 }}
                                        >
                                            {Math.round(result.potOdds * 100)}%
                                        </span>
                                    </span>
                                )}
                            </div>

                            <p
                                className="text-xs leading-relaxed"
                                style={{ color: "var(--sd-ivory)", opacity: 0.7 }}
                            >
                                {result.reasoning}
                            </p>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}

// ── CoachPanel (unified surface) ────────────────────────────────────

interface CoachPanelProps {
    /** "desktop" = right rail, "mobile" = collapsible bottom sheet */
    variant: "desktop" | "mobile";
}

export function CoachPanel({ variant }: CoachPanelProps) {
    const trainingMode = useGameStore((s) => s.trainingMode);
    const [mobileOpen, setMobileOpen] = useState(false);

    if (!trainingMode) return null;

    // ── Desktop rail ────────────────────────────────────────────────
    if (variant === "desktop") {
        return (
            <aside
                aria-label="Coaching panel"
                data-testid="coach-panel-desktop"
                className="hidden md:flex flex-col w-72 shrink-0 overflow-y-auto"
                style={{
                    background: "var(--sd-surface)",
                    borderLeft: "1px solid var(--sd-smoke)",
                }}
            >
                <div className="p-4 space-y-4">
                    <h2
                        className="text-xs font-bold uppercase tracking-widest"
                        style={{
                            color: "var(--sd-brass)",
                            fontFamily: "var(--sd-font-display)",
                        }}
                    >
                        Coach
                    </h2>
                    <CoachBadges />
                    <CoachHint />
                </div>
            </aside>
        );
    }

    // ── Mobile collapsible sheet ────────────────────────────────────
    return (
        <div data-testid="coach-panel-mobile" className="md:hidden shrink-0">
            <button
                onClick={() => setMobileOpen((o) => !o)}
                className="w-full flex items-center justify-center gap-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-[var(--sd-brass)]"
                style={{
                    background: "var(--sd-surface)",
                    color: "var(--sd-brass)",
                    borderTop: "1px solid var(--sd-smoke)",
                    fontFamily: "var(--sd-font-display)",
                }}
                aria-label={mobileOpen ? "Collapse coach panel" : "Expand coach panel"}
                aria-expanded={mobileOpen}
            >
                Coach {mobileOpen ? "\u25BE" : "\u25B8"}
            </button>

            {mobileOpen && (
                <div
                    className="p-4 space-y-4"
                    style={{
                        background: "var(--sd-surface)",
                        borderTop: "1px solid var(--sd-smoke)",
                    }}
                >
                    <CoachBadges />
                    <CoachHint />
                </div>
            )}
        </div>
    );
}
