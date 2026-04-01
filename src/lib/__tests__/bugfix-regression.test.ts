import { describe, it, expect } from "vitest";
import { getDetailedHandDescription } from "../evaluator";
import { analyzeHand } from "../analysis";
import { generateCorrectPlayCoaching } from "../coaching";
import { HandRank } from "../../types/poker";
import type {
    HandHistory,
    Player,
    Decision,
    CoachingContext,
    BoardTexture,
    DrawInfo,
    PlayerAction,
} from "../../types/poker";

// ── Helpers ─────────────────────────────────────────────────────────

function makeHandHistory(overrides: Partial<HandHistory> = {}): HandHistory {
    const hero: Player = {
        id: "hero",
        name: "Hero",
        stack: 500,
        holeCards: [
            { suit: "hearts", rank: "A" },
            { suit: "spades", rank: "K" },
        ],
        isDealer: true,
        isFolded: false,
        currentBet: 0,
        isHero: true,
        isAllIn: false,
    };
    const villain: Player = {
        id: "villain",
        name: "Villain",
        stack: 500,
        holeCards: [
            { suit: "clubs", rank: "Q" },
            { suit: "diamonds", rank: "J" },
        ],
        isDealer: false,
        isFolded: false,
        currentBet: 0,
        isHero: false,
        isAllIn: false,
    };

    return {
        handNumber: 1,
        bigBlind: 2,
        players: [hero, villain],
        communityCards: [
            { suit: "hearts", rank: "10" },
            { suit: "spades", rank: "7" },
            { suit: "clubs", rank: "3" },
            { suit: "diamonds", rank: "9" },
            { suit: "hearts", rank: "2" },
        ],
        actions: [
            // Preflop: villain posts SB, hero posts BB, villain calls
            { playerId: "villain", type: "call", amount: 2, round: "preflop", timestamp: 1 },
            { playerId: "hero", type: "check", round: "preflop", timestamp: 2 },
        ],
        pot: 4,
        winnerId: "hero",
        winnerHand: "Pair",
        potWon: 4,
        ...overrides,
    };
}

function makeDecision(overrides: Partial<Decision> = {}): Decision {
    return {
        round: "flop",
        heroAction: "call",
        optimalAction: "call",
        optimalFrequencies: { fold: 0.1, call: 0.6, raise: 0.3 },
        evDiff: 0,
        equity: 0.45,
        potOdds: 0.25,
        spr: 5,
        draws: {
            flushDraw: false,
            flushDrawOuts: 0,
            oesD: false,
            gutshot: false,
            straightDrawOuts: 0,
            backdoorFlush: false,
            backdoorStraight: false,
            totalOuts: 0,
            drawEquity: 0,
        },
        boardTexture: {
            wetness: "dry",
            isMonotone: false,
            isTwoTone: false,
            isRainbow: true,
            isPaired: false,
            isTrips: false,
            highCardCount: 0,
            connectedness: 0,
            possibleStraights: 0,
            possibleFlushes: false,
        },
        ...overrides,
    };
}

const defaultBoardTexture: BoardTexture = {
    wetness: "dry",
    isMonotone: false,
    isTwoTone: false,
    isRainbow: true,
    isPaired: false,
    isTrips: false,
    highCardCount: 0,
    connectedness: 0,
    possibleStraights: 0,
    possibleFlushes: false,
};

const defaultDraws: DrawInfo = {
    flushDraw: false,
    flushDrawOuts: 0,
    oesD: false,
    gutshot: false,
    straightDrawOuts: 0,
    backdoorFlush: false,
    backdoorStraight: false,
    totalOuts: 0,
    drawEquity: 0,
};

// ── Tests ───────────────────────────────────────────────────────────

describe("Bug fix regressions", () => {
    // ── Bug 2: getDetailedHandDescription ───────────────────────────

    describe("Bug 2: getDetailedHandDescription", () => {
        it("describes HIGH_CARD with ace", () => {
            expect(getDetailedHandDescription(HandRank.HIGH_CARD, [14])).toBe(
                "High Card A",
            );
        });

        it("describes PAIR of fives with kickers", () => {
            expect(
                getDetailedHandDescription(HandRank.PAIR, [5, 14, 13, 12]),
            ).toBe("Pair of Fives, A-K-Q kicker");
        });

        it("describes PAIR of aces with kickers", () => {
            expect(
                getDetailedHandDescription(HandRank.PAIR, [14, 13, 12, 11]),
            ).toBe("Pair of Aces, K-Q-J kicker");
        });

        it("describes TWO_PAIR kings and sevens", () => {
            expect(
                getDetailedHandDescription(HandRank.TWO_PAIR, [13, 7]),
            ).toBe("Two Pair, Kings and Sevens");
        });

        it("describes THREE_OF_A_KIND aces", () => {
            expect(
                getDetailedHandDescription(HandRank.THREE_OF_A_KIND, [14]),
            ).toBe("Three Aces");
        });

        it("describes STRAIGHT king-high", () => {
            expect(
                getDetailedHandDescription(HandRank.STRAIGHT, [13]),
            ).toBe("Straight, K-high");
        });

        it("describes FLUSH ace-high", () => {
            expect(
                getDetailedHandDescription(HandRank.FLUSH, [14]),
            ).toBe("Flush, A-high");
        });

        it("describes FULL_HOUSE aces full of kings", () => {
            expect(
                getDetailedHandDescription(HandRank.FULL_HOUSE, [14, 13]),
            ).toBe("Full House, Aces full of Kings");
        });

        it("describes FOUR_OF_A_KIND queens", () => {
            expect(
                getDetailedHandDescription(HandRank.FOUR_OF_A_KIND, [12]),
            ).toBe("Four Queens");
        });

        it("describes STRAIGHT_FLUSH king-high", () => {
            expect(
                getDetailedHandDescription(HandRank.STRAIGHT_FLUSH, [13]),
            ).toBe("Straight Flush, K-high");
        });

        it("describes ROYAL_FLUSH", () => {
            expect(
                getDetailedHandDescription(HandRank.ROYAL_FLUSH, [14]),
            ).toBe("Royal Flush");
        });
    });

    // ── Bug 1 & 4: analyzeHand multi-action per street ─────────────

    describe("Bug 1 & 4: analyzeHand multi-action per street", () => {
        it("produces 2 flop decisions when hero acts twice on flop", () => {
            const actions: PlayerAction[] = [
                { playerId: "villain", type: "call", amount: 2, round: "preflop", timestamp: 1 },
                { playerId: "hero", type: "check", round: "preflop", timestamp: 2 },
                // Flop
                { playerId: "hero", type: "check", round: "flop", timestamp: 3 },
                { playerId: "villain", type: "bet", amount: 4, round: "flop", timestamp: 4 },
                { playerId: "hero", type: "call", amount: 4, round: "flop", timestamp: 5 },
            ];

            const hand = makeHandHistory({ actions });
            const result = analyzeHand(hand);

            const flopDecisions = result.decisions.filter(
                (d) => d.round === "flop",
            );

            expect(flopDecisions.length).toBe(2);
            expect(flopDecisions[0].heroAction).toBe("check");
            expect(flopDecisions[1].heroAction).toBe("call");
        });

        it("produces 1 decision per round when hero acts once", () => {
            const hand = makeHandHistory();
            const result = analyzeHand(hand);

            // Only preflop has a hero action (check)
            expect(result.decisions.length).toBe(1);
            expect(result.decisions[0].round).toBe("preflop");
            expect(result.decisions[0].heroAction).toBe("check");
        });
    });

    // ── Bug 5: coaching uses optimalAction for correct-play text ────

    describe("Bug 5: coaching uses optimalAction for correct-play text", () => {
        it("includes optimalAction in whatToDo when play is correct", () => {
            const decision = makeDecision({
                heroAction: "call",
                optimalAction: "call",
                equity: 0.55,
                potOdds: 0.25,
            });

            const ctx: CoachingContext = {
                decision,
                mistakeType: null,
                mastery: undefined,
                boardTexture: defaultBoardTexture,
                draws: defaultDraws,
                round: "flop",
            };

            const coaching = generateCorrectPlayCoaching(ctx);

            // whatToDo should reference the optimal action ("call"), not be undefined
            expect(coaching.whatToDo).toContain("call");
            expect(coaching.whatToDo).not.toContain("undefined");
        });

        it("whyMistake is null for correct plays", () => {
            const decision = makeDecision({
                heroAction: "raise",
                optimalAction: "raise",
                equity: 0.7,
                potOdds: 0.2,
            });

            const ctx: CoachingContext = {
                decision,
                mistakeType: null,
                mastery: undefined,
                boardTexture: defaultBoardTexture,
                draws: defaultDraws,
                round: "flop",
            };

            const coaching = generateCorrectPlayCoaching(ctx);

            expect(coaching.whyMistake).toBeNull();
            expect(coaching.whatToDo).toContain("raise");
        });
    });
});
