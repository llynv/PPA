import type { Card, HandEvaluation } from "../types/poker";
import { HandRank } from "../types/poker";
import { RANK_VALUES } from "./deck";

// ── Hand Description ────────────────────────────────────────────────

const HAND_DESCRIPTIONS: Record<HandRank, string> = {
    [HandRank.HIGH_CARD]: "High Card",
    [HandRank.PAIR]: "Pair",
    [HandRank.TWO_PAIR]: "Two Pair",
    [HandRank.THREE_OF_A_KIND]: "Three of a Kind",
    [HandRank.STRAIGHT]: "Straight",
    [HandRank.FLUSH]: "Flush",
    [HandRank.FULL_HOUSE]: "Full House",
    [HandRank.FOUR_OF_A_KIND]: "Four of a Kind",
    [HandRank.STRAIGHT_FLUSH]: "Straight Flush",
    [HandRank.ROYAL_FLUSH]: "Royal Flush",
};

/** Returns human-readable name for a HandRank. */
export function getHandDescription(rank: HandRank): string {
    return HAND_DESCRIPTIONS[rank];
}

// ── Detailed Hand Description ───────────────────────────────────────

/** Plural rank name for pairs/trips/quads (e.g. 14→"Aces", 5→"Fives"). */
function rankNamePlural(value: number): string {
    const PLURAL_NAMES: Record<number, string> = {
        14: "Aces",
        13: "Kings",
        12: "Queens",
        11: "Jacks",
        10: "Tens",
        9: "Nines",
        8: "Eights",
        7: "Sevens",
        6: "Sixes",
        5: "Fives",
        4: "Fours",
        3: "Threes",
        2: "Twos",
    };
    return PLURAL_NAMES[value] ?? String(value);
}

/** Singular rank abbreviation for kickers / high cards (e.g. 14→"A", 11→"J", 7→"7"). */
function rankNameShort(value: number): string {
    if (value === 14) return "A";
    if (value === 13) return "K";
    if (value === 12) return "Q";
    if (value === 11) return "J";
    return String(value);
}

/**
 * Returns a detailed human-readable description including rank values and kickers.
 *
 * Examples:
 *  - "High Card A"
 *  - "Pair of Fives, A-K-Q kicker"
 *  - "Two Pair, Kings and Sevens"
 *  - "Three Aces"
 *  - "Straight, King-high"
 *  - "Flush, Ace-high"
 *  - "Full House, Aces full of Kings"
 *  - "Four Queens"
 *  - "Straight Flush, King-high"
 *  - "Royal Flush"
 */
export function getDetailedHandDescription(
    rank: HandRank,
    tiebreakers: number[],
): string {
    switch (rank) {
        case HandRank.ROYAL_FLUSH:
            return "Royal Flush";

        case HandRank.STRAIGHT_FLUSH:
            return `Straight Flush, ${rankNameShort(tiebreakers[0])}-high`;

        case HandRank.FOUR_OF_A_KIND:
            return `Four ${rankNamePlural(tiebreakers[0])}`;

        case HandRank.FULL_HOUSE:
            return `Full House, ${rankNamePlural(tiebreakers[0])} full of ${rankNamePlural(tiebreakers[1])}`;

        case HandRank.FLUSH:
            return `Flush, ${rankNameShort(tiebreakers[0])}-high`;

        case HandRank.STRAIGHT:
            return `Straight, ${rankNameShort(tiebreakers[0])}-high`;

        case HandRank.THREE_OF_A_KIND:
            return `Three ${rankNamePlural(tiebreakers[0])}`;

        case HandRank.TWO_PAIR:
            return `Two Pair, ${rankNamePlural(tiebreakers[0])} and ${rankNamePlural(tiebreakers[1])}`;

        case HandRank.PAIR: {
            const kickers = tiebreakers
                .slice(1)
                .map(rankNameShort)
                .join("-");
            return `Pair of ${rankNamePlural(tiebreakers[0])}, ${kickers} kicker`;
        }

        case HandRank.HIGH_CARD:
            return `High Card ${rankNameShort(tiebreakers[0])}`;

        default:
            return HAND_DESCRIPTIONS[rank] ?? "Unknown";
    }
}

// ── Combination Generation ──────────────────────────────────────────

/** Generates all C(n, k) combinations of the given array. */
function combinations<T>(arr: T[], k: number): T[][] {
    const result: T[][] = [];

    function backtrack(start: number, current: T[]) {
        if (current.length === k) {
            result.push([...current]);
            return;
        }
        for (let i = start; i < arr.length; i++) {
            current.push(arr[i]);
            backtrack(i + 1, current);
            current.pop();
        }
    }

    backtrack(0, []);
    return result;
}

// ── Five-Card Hand Evaluation ───────────────────────────────────────

interface FiveCardResult {
    rank: HandRank;
    /** Descending values used for tiebreaking (most significant first). */
    tiebreakers: number[];
    cards: Card[];
}

/**
 * Evaluates exactly 5 cards and returns the hand rank plus tiebreaker
 * values for comparison within the same rank category.
 */
function evaluateFiveCards(cards: Card[]): FiveCardResult {
    const values = cards.map((c) => RANK_VALUES[c.rank]).sort((a, b) => b - a);
    const suits = cards.map((c) => c.suit);

    // Count occurrences of each rank value
    const valueCounts = new Map<number, number>();
    for (const v of values) {
        valueCounts.set(v, (valueCounts.get(v) ?? 0) + 1);
    }

    // Sort groups: by count descending, then by value descending
    const groups = Array.from(valueCounts.entries()).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return b[0] - a[0];
    });

    const isFlush = suits.every((s) => s === suits[0]);
    const isStraight = checkStraight(values);

    // Special case: A-2-3-4-5 straight (wheel)
    const isWheel =
        values[0] === 14 &&
        values[1] === 5 &&
        values[2] === 4 &&
        values[3] === 3 &&
        values[4] === 2;

    // Determine the high card of the straight
    const straightHigh = isWheel ? 5 : values[0];

    // ── Check hands from strongest to weakest ──

    if (isFlush && isStraight) {
        if (straightHigh === 14 && !isWheel) {
            return { rank: HandRank.ROYAL_FLUSH, tiebreakers: [14], cards };
        }
        return {
            rank: HandRank.STRAIGHT_FLUSH,
            tiebreakers: [straightHigh],
            cards,
        };
    }

    if (groups[0][1] === 4) {
        // Four of a Kind — tiebreak: quad value, then kicker
        return {
            rank: HandRank.FOUR_OF_A_KIND,
            tiebreakers: [groups[0][0], groups[1][0]],
            cards,
        };
    }

    if (groups[0][1] === 3 && groups[1][1] === 2) {
        // Full House — tiebreak: trips value, then pair value
        return {
            rank: HandRank.FULL_HOUSE,
            tiebreakers: [groups[0][0], groups[1][0]],
            cards,
        };
    }

    if (isFlush) {
        return { rank: HandRank.FLUSH, tiebreakers: values, cards };
    }

    if (isStraight) {
        return { rank: HandRank.STRAIGHT, tiebreakers: [straightHigh], cards };
    }

    if (groups[0][1] === 3) {
        // Three of a Kind — tiebreak: trips value, then kickers descending
        const kickers = groups
            .slice(1)
            .map((g) => g[0])
            .sort((a, b) => b - a);
        return {
            rank: HandRank.THREE_OF_A_KIND,
            tiebreakers: [groups[0][0], ...kickers],
            cards,
        };
    }

    if (groups[0][1] === 2 && groups[1][1] === 2) {
        // Two Pair — tiebreak: high pair, low pair, kicker
        const pairValues = [groups[0][0], groups[1][0]].sort((a, b) => b - a);
        const kicker = groups[2][0];
        return {
            rank: HandRank.TWO_PAIR,
            tiebreakers: [...pairValues, kicker],
            cards,
        };
    }

    if (groups[0][1] === 2) {
        // Pair — tiebreak: pair value, then kickers descending
        const kickers = groups
            .slice(1)
            .map((g) => g[0])
            .sort((a, b) => b - a);
        return {
            rank: HandRank.PAIR,
            tiebreakers: [groups[0][0], ...kickers],
            cards,
        };
    }

    // High Card
    return { rank: HandRank.HIGH_CARD, tiebreakers: values, cards };
}

/** Checks if sorted-descending values form a straight (including wheel). */
function checkStraight(values: number[]): boolean {
    // Normal straight: each card is exactly 1 less than the previous
    const isNormal =
        values[0] - values[1] === 1 &&
        values[1] - values[2] === 1 &&
        values[2] - values[3] === 1 &&
        values[3] - values[4] === 1;

    // Wheel: A-5-4-3-2
    const isWheel =
        values[0] === 14 &&
        values[1] === 5 &&
        values[2] === 4 &&
        values[3] === 3 &&
        values[4] === 2;

    return isNormal || isWheel;
}

// ── Strength Calculation ────────────────────────────────────────────

/**
 * Computes a normalized 0–1 strength from a FiveCardResult.
 *
 * There are 10 hand-rank tiers (0–9). Each tier occupies 1/10 of the
 * [0, 1) range. Within a tier, tiebreaker values (each 2–14) are
 * encoded in a base-15 fractional system that always stays below 1,
 * guaranteeing the result never overflows into the next tier.
 */
function computeStrength(result: FiveCardResult): number {
    const TIERS = 10;
    const base = result.rank / TIERS;

    // Encode tiebreakers as a fraction in [0, 1)
    // Each tiebreaker digit is in 0..14, using base 15 so the total < 1
    let tiebreaker = 0;
    let multiplier = 1;
    for (const tb of result.tiebreakers) {
        multiplier /= 15;
        tiebreaker += tb * multiplier;
    }

    // Scale tiebreaker to fit within one tier (1/10 of overall range)
    const tierSize = 1 / TIERS;
    return base + tiebreaker * tierSize;
}

// ── Compare FiveCardResults ─────────────────────────────────────────

/** Compares two five-card results. Positive if a > b, negative if a < b, 0 if tie. */
function compareFiveCardResults(a: FiveCardResult, b: FiveCardResult): number {
    if (a.rank !== b.rank) return a.rank - b.rank;
    for (
        let i = 0;
        i < Math.min(a.tiebreakers.length, b.tiebreakers.length);
        i++
    ) {
        if (a.tiebreakers[i] !== b.tiebreakers[i]) {
            return a.tiebreakers[i] - b.tiebreakers[i];
        }
    }
    return 0;
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Evaluates a poker hand of 5–7 cards and returns the best 5-card hand.
 *
 * When given more than 5 cards it generates all C(n,5) combinations
 * and picks the strongest.
 */
export function evaluateHand(cards: Card[]): HandEvaluation {
    if (cards.length < 5 || cards.length > 7) {
        throw new Error(
            `evaluateHand requires 5–7 cards, received ${cards.length}`,
        );
    }

    let best: FiveCardResult | null = null;

    if (cards.length === 5) {
        best = evaluateFiveCards(cards);
    } else {
        for (const combo of combinations(cards, 5)) {
            const result = evaluateFiveCards(combo);
            if (!best || compareFiveCardResults(result, best) > 0) {
                best = result;
            }
        }
    }

    // `best` is guaranteed non-null because cards.length >= 5
    const result = best!;

    return {
        rank: result.rank,
        cards: result.cards,
        description: getDetailedHandDescription(result.rank, result.tiebreakers),
        strength: computeStrength(result),
    };
}

/**
 * Compares two hands (each 5–7 cards).
 *
 * @returns positive if A wins, negative if B wins, 0 for a tie.
 */
export function compareHands(handA: Card[], handB: Card[]): number {
    const evalA = evaluateHand(handA);
    const evalB = evaluateHand(handB);

    // Compare by rank first, then by tiebreaker-encoded strength
    if (evalA.rank !== evalB.rank) return evalA.rank - evalB.rank;

    // For same rank, re-evaluate to get tiebreakers for precise comparison
    const bestA = getBestFiveCardResult(handA);
    const bestB = getBestFiveCardResult(handB);
    return compareFiveCardResults(bestA, bestB);
}

/** Internal helper: gets the best FiveCardResult from 5-7 cards. */
function getBestFiveCardResult(cards: Card[]): FiveCardResult {
    let best: FiveCardResult | null = null;

    if (cards.length === 5) {
        return evaluateFiveCards(cards);
    }

    for (const combo of combinations(cards, 5)) {
        const result = evaluateFiveCards(combo);
        if (!best || compareFiveCardResults(result, best) > 0) {
            best = result;
        }
    }

    return best!;
}

/**
 * Convenience wrapper: combines hole cards and community cards, then evaluates.
 */
export function getBestHand(
    holeCards: Card[],
    communityCards: Card[],
): HandEvaluation {
    return evaluateHand([...holeCards, ...communityCards]);
}
