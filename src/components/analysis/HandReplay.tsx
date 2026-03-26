import { useState } from "react";
import type { Card, BettingRound } from "../../types/poker";
import { suitSymbol, suitColor } from "../../lib/deck";
import { useGameStore } from "../../store/gameStore";

// ── Mini Card Display ───────────────────────────────────────────────

function MiniCard({ card }: { card: Card }) {
    const color =
        suitColor(card.suit) === "red" ? "text-red-500" : "text-slate-800";

    return (
        <div
            className={`w-8 h-11 md:w-10 md:h-14 bg-white rounded-md border border-slate-300 flex flex-col items-center justify-center ${color}`}
        >
            <span className="text-[10px] md:text-xs font-bold">
                {card.rank}
            </span>
            <span className="text-xs md:text-sm">{suitSymbol(card.suit)}</span>
        </div>
    );
}

function EmptySlot() {
    return (
        <div className="w-8 h-11 md:w-10 md:h-14 rounded-md border border-dashed border-slate-600 flex items-center justify-center">
            <span className="text-slate-600 text-[10px]">?</span>
        </div>
    );
}

// ── Street tabs ─────────────────────────────────────────────────────

const STREETS: BettingRound[] = ["preflop", "flop", "turn", "river"];

const STREET_LABELS: Record<BettingRound, string> = {
    preflop: "Preflop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
};

function getCommunityCardsAtStreet(
    allCards: Card[],
    street: BettingRound,
): Card[] {
    switch (street) {
        case "preflop":
            return [];
        case "flop":
            return allCards.slice(0, 3);
        case "turn":
            return allCards.slice(0, 4);
        case "river":
            return allCards.slice(0, 5);
    }
}

// ── Component ───────────────────────────────────────────────────────

export function HandReplay() {
    const handHistory = useGameStore((s) => s.handHistory);
    const analysisData = useGameStore((s) => s.analysisData);

    const latestHand = handHistory[handHistory.length - 1];
    if (!latestHand || !analysisData) return null;

    const heroPlayer = latestHand.players.find((p) => p.isHero);
    if (!heroPlayer) return null;

    // Determine which streets had decisions
    const decisionStreets = new Set(analysisData.decisions.map((d) => d.round));
    const availableStreets = STREETS.filter(
        (s) =>
            s === "preflop" ||
            (s === "flop" && latestHand.communityCards.length >= 3) ||
            (s === "turn" && latestHand.communityCards.length >= 4) ||
            (s === "river" && latestHand.communityCards.length >= 5),
    );

    const [selectedStreet, setSelectedStreet] = useState<BettingRound>(
        availableStreets[availableStreets.length - 1] ?? "preflop",
    );

    const communityCards = getCommunityCardsAtStreet(
        latestHand.communityCards,
        selectedStreet,
    );
    const emptySlots = 5 - communityCards.length;

    // Calculate pot at this street from actions
    const streetOrder: BettingRound[] = [
        "preflop",
        "flop",
        "turn",
        "river",
    ];
    const streetIdx = streetOrder.indexOf(selectedStreet);
    const potAtStreet = latestHand.actions
        .filter(
            (a) => streetOrder.indexOf(a.round) <= streetIdx && a.amount != null,
        )
        .reduce((sum, a) => sum + (a.amount ?? 0), 0);

    return (
        <div className="bg-slate-800 rounded-xl p-4 shadow-lg">
            {/* Street selector tabs */}
            <div className="flex gap-1 mb-3 justify-center">
                {availableStreets.map((street) => (
                    <button
                        key={street}
                        onClick={() => setSelectedStreet(street)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                            selectedStreet === street
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-700 text-slate-400 hover:text-slate-200"
                        } ${decisionStreets.has(street) ? "" : "opacity-50"}`}
                    >
                        {STREET_LABELS[street]}
                    </button>
                ))}
            </div>

            {/* Mini table */}
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                {/* Hero's hole cards */}
                <div className="flex justify-center gap-1 mb-3">
                    <span className="text-slate-400 text-xs mr-2 self-center">
                        Hero:
                    </span>
                    {heroPlayer.holeCards.map((card, i) => (
                        <MiniCard key={i} card={card} />
                    ))}
                </div>

                {/* Community cards */}
                <div className="flex justify-center gap-1">
                    {communityCards.map((card, i) => (
                        <MiniCard key={i} card={card} />
                    ))}
                    {Array.from({ length: emptySlots }, (_, i) => (
                        <EmptySlot key={`empty-${i}`} />
                    ))}
                </div>
            </div>

            {/* Info row */}
            <div className="flex justify-center gap-4 mt-2 text-xs text-slate-400">
                <span>Pot: ${potAtStreet.toLocaleString()}</span>
                <span>
                    Stack: ${heroPlayer.stack.toLocaleString()}
                </span>
            </div>
        </div>
    );
}
