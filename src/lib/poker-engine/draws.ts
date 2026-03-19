import type { Card, DrawInfo, Suit } from '../../types/poker';
import { cardValue } from '../deck';

/**
 * Returns an all-false DrawInfo (no draws detected).
 */
function emptyDrawInfo(): DrawInfo {
    return {
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
}

/**
 * Detects flush draws from the combined cards.
 *
 * Flush draw: exactly 4 cards of the same suit, with at least 1 hole card
 * contributing to that suit. Returns 9 outs.
 */
function detectFlushDraw(
    holeCards: Card[],
    allCards: Card[],
): { flushDraw: boolean; flushDrawOuts: number } {
    const suitCounts: Record<Suit, number> = {
        hearts: 0,
        diamonds: 0,
        clubs: 0,
        spades: 0,
    };

    for (const card of allCards) {
        suitCounts[card.suit]++;
    }

    const holeSuits = new Set(holeCards.map((c) => c.suit));

    for (const suit of Object.keys(suitCounts) as Suit[]) {
        if (suitCounts[suit] === 4 && holeSuits.has(suit)) {
            return { flushDraw: true, flushDrawOuts: 9 };
        }
    }

    return { flushDraw: false, flushDrawOuts: 0 };
}

/**
 * Detects backdoor flush draws (only on the flop).
 *
 * Backdoor flush: exactly 3 cards of the same suit, with at least 1 hole card
 * contributing. Only checked when there are exactly 3 community cards.
 */
function detectBackdoorFlush(
    holeCards: Card[],
    allCards: Card[],
    communityCount: number,
): boolean {
    if (communityCount !== 3) return false;

    const suitCounts: Record<Suit, number> = {
        hearts: 0,
        diamonds: 0,
        clubs: 0,
        spades: 0,
    };

    for (const card of allCards) {
        suitCounts[card.suit]++;
    }

    const holeSuits = new Set(holeCards.map((c) => c.suit));

    for (const suit of Object.keys(suitCounts) as Suit[]) {
        if (suitCounts[suit] === 3 && holeSuits.has(suit)) {
            return true;
        }
    }

    return false;
}

/**
 * Gets sorted unique card values from a set of cards.
 * Ace is always included as 14, and also as 1 for wheel detection.
 */
function getUniqueValues(cards: Card[]): number[] {
    const values = new Set<number>();
    let hasAce = false;

    for (const card of cards) {
        const v = cardValue(card);
        values.add(v);
        if (v === 14) hasAce = true;
    }

    // Add ace-low (1) for wheel straight detection
    if (hasAce) {
        values.add(1);
    }

    return Array.from(values).sort((a, b) => a - b);
}

/**
 * Checks whether the given sorted unique values contain a made straight
 * (5 or more consecutive values).
 */
function hasMadeStraight(values: number[]): boolean {
    let consecutive = 1;
    for (let i = 1; i < values.length; i++) {
        if (values[i] === values[i - 1] + 1) {
            consecutive++;
            if (consecutive >= 5) return true;
        } else {
            consecutive = 1;
        }
    }
    return false;
}

/**
 * Detects straight draws (OESD and gutshot).
 *
 * OESD: 4 consecutive unique values → 8 outs.
 * Gutshot: 4 values within a span of 5 consecutive values, with exactly 1 gap → 4 outs.
 *
 * When both OESD and gutshot are detected, straightDrawOuts = max (8).
 *
 * If a made straight already exists, straight draws are suppressed.
 */
function detectStraightDraws(allCards: Card[]): {
    oesD: boolean;
    gutshot: boolean;
    straightDrawOuts: number;
} {
    const values = getUniqueValues(allCards);

    // If we already have a made straight, no straight "draws" to report
    if (hasMadeStraight(values)) {
        return { oesD: false, gutshot: false, straightDrawOuts: 0 };
    }

    let oesD = false;
    let gutshot = false;

    // Check all windows of 4 consecutive values for OESD
    for (let i = 0; i <= values.length - 4; i++) {
        if (
            values[i + 1] === values[i] + 1 &&
            values[i + 2] === values[i] + 2 &&
            values[i + 3] === values[i] + 3
        ) {
            const lowEnd = values[i];
            const highEnd = values[i + 3];

            // A-high block: if highEnd is 14 (A), can't go higher → only 1 end open
            // Wheel block: if lowEnd is 1 (ace-low), A-2-3-4 only completes with 5
            if (highEnd === 14 || lowEnd === 1) {
                // Only one end can complete — this is a gutshot, not OESD
                gutshot = true;
            } else {
                oesD = true;
            }
        }
    }

    // Check for gutshot: 4 values within a window of 5 with exactly 1 gap
    for (let target = 1; target <= 10; target++) {
        const windowEnd = target + 4;

        const inWindow: number[] = [];
        for (const v of values) {
            if (v >= target && v <= windowEnd) {
                inWindow.push(v);
            }
        }

        if (inWindow.length === 4) {
            // Check: are these 4 values consecutive?
            const sorted = [...inWindow].sort((a, b) => a - b);
            const isConsecutive =
                sorted[1] === sorted[0] + 1 &&
                sorted[2] === sorted[0] + 2 &&
                sorted[3] === sorted[0] + 3;

            if (!isConsecutive) {
                // There's a gap — this is a gutshot
                gutshot = true;
            }
        }
    }

    let straightDrawOuts = 0;
    if (oesD && gutshot) {
        straightDrawOuts = 8; // OESD dominates
    } else if (oesD) {
        straightDrawOuts = 8;
    } else if (gutshot) {
        straightDrawOuts = 4;
    }

    return { oesD, gutshot, straightDrawOuts };
}

/**
 * Detects backdoor straight draws (only on the flop).
 *
 * Backdoor straight: 3 cards within a span of 5 consecutive values.
 * Only checked when there are exactly 3 community cards.
 */
function detectBackdoorStraight(
    allCards: Card[],
    communityCount: number,
): boolean {
    if (communityCount !== 3) return false;

    const values = getUniqueValues(allCards);

    for (let target = 1; target <= 10; target++) {
        const windowEnd = target + 4;
        const inWindow = values.filter((v) => v >= target && v <= windowEnd);
        if (inWindow.length >= 3) {
            return true;
        }
    }

    return false;
}

/**
 * Detects drawing hands from hole cards + community cards.
 *
 * Only applicable postflop (needs at least 3 community cards for flush/straight draws).
 * With < 3 community cards, returns all-false DrawInfo.
 *
 * Draw types:
 * - Flush draw: 4 cards of same suit (hero must contribute at least 1) → 9 outs
 * - Open-ended straight draw (OESD): 4 consecutive values → 8 outs
 * - Gutshot: 4 of 5 consecutive values with 1 gap → 4 outs
 * - Backdoor flush: 3 cards of same suit on flop (hero contributes at least 1)
 * - Backdoor straight: 3 of 5 consecutive values on flop
 *
 * drawEquity calculation:
 * - On flop (3 community): outs * 4 / 100 (rule of 4 for two cards to come)
 * - On turn (4 community): outs * 2 / 100 (rule of 2 for one card to come)
 * - On river (5 community): 0 (no more cards)
 *
 * totalOuts: straightDrawOuts + flushDrawOuts (but if we have both flush and straight draws,
 * subtract overlapping outs — approximately 1-2 outs overlap for combo draws,
 * simplify to max(0, straightOuts + flushOuts - 1))
 */
export function detectDraws(
    holeCards: Card[],
    communityCards: Card[],
): DrawInfo {
    if (communityCards.length < 3) {
        return emptyDrawInfo();
    }

    const allCards = [...holeCards, ...communityCards];
    const communityCount = communityCards.length;

    // Flush draw detection
    const { flushDraw, flushDrawOuts } = detectFlushDraw(
        holeCards,
        allCards,
    );

    // Straight draw detection
    const { oesD, gutshot, straightDrawOuts } = detectStraightDraws(allCards);

    // Backdoor draws (flop only)
    const backdoorFlush = detectBackdoorFlush(
        holeCards,
        allCards,
        communityCount,
    );
    const backdoorStraight = detectBackdoorStraight(allCards, communityCount);

    // Total outs: combine flush and straight outs, subtract overlap for combo draws
    let totalOuts = flushDrawOuts + straightDrawOuts;
    if (flushDraw && (oesD || gutshot) && totalOuts > 0) {
        // Subtract ~1 out for overlap (cards that complete both draws)
        totalOuts = Math.max(0, totalOuts - 1);
    }

    // Draw equity using rule of 4 (flop) / rule of 2 (turn)
    let drawEquity = 0;
    if (communityCount === 3) {
        drawEquity = (totalOuts * 4) / 100;
    } else if (communityCount === 4) {
        drawEquity = (totalOuts * 2) / 100;
    }
    // River (5 community cards): drawEquity stays 0

    return {
        flushDraw,
        flushDrawOuts,
        oesD,
        gutshot,
        straightDrawOuts,
        backdoorFlush,
        backdoorStraight,
        totalOuts,
        drawEquity,
    };
}
