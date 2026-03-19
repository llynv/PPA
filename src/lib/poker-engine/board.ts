import type { Card, BoardTexture, Suit } from '../../types/poker';
import { cardValue } from '../deck';

/**
 * Analyzes community cards and returns board texture information.
 *
 * If no community cards (preflop), returns a "neutral" board texture.
 */
export function analyzeBoard(communityCards: Card[]): BoardTexture {
    // Preflop: no community cards
    if (communityCards.length === 0) {
        return {
            wetness: 'dry',
            isMonotone: false,
            isTwoTone: false,
            isRainbow: false,
            isPaired: false,
            isTrips: false,
            highCardCount: 0,
            connectedness: 0,
            possibleStraights: 0,
            possibleFlushes: false,
        };
    }

    // Suit analysis
    const suitCounts = countSuits(communityCards);
    const uniqueSuits = Object.keys(suitCounts).length;
    const maxSuitCount = Math.max(...Object.values(suitCounts));

    const isMonotone = uniqueSuits === 1;
    const isTwoTone = uniqueSuits === 2;
    const isRainbow = uniqueSuits >= 3;

    // Rank analysis
    const rankCounts = countRanks(communityCards);
    const maxRankCount = Math.max(...Object.values(rankCounts));

    const isPaired = maxRankCount >= 2;
    const isTrips = maxRankCount >= 3;

    // High card count (broadway: 10, J, Q, K, A → values 10-14)
    const highCardCount = communityCards.filter(c => cardValue(c) >= 10).length;

    // Connectedness
    const connectedness = calculateConnectedness(communityCards);

    // Possible straights
    const possibleStraights = countPossibleStraights(communityCards);

    // Possible flushes: 3+ cards of one suit
    const possibleFlushes = maxSuitCount >= 3;

    // Wetness calculation
    const wetness = calculateWetness({
        isMonotone,
        isTwoTone,
        isPaired,
        highCardCount,
        connectedness,
        possibleStraights,
    });

    return {
        wetness,
        isMonotone,
        isTwoTone,
        isRainbow,
        isPaired,
        isTrips,
        highCardCount,
        connectedness,
        possibleStraights,
        possibleFlushes,
    };
}

// ── Helpers ─────────────────────────────────────────────────────────

function countSuits(cards: Card[]): Partial<Record<Suit, number>> {
    const counts: Partial<Record<Suit, number>> = {};
    for (const card of cards) {
        counts[card.suit] = (counts[card.suit] ?? 0) + 1;
    }
    return counts;
}

function countRanks(cards: Card[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const card of cards) {
        counts[card.rank] = (counts[card.rank] ?? 0) + 1;
    }
    return counts;
}

/**
 * Calculates connectedness on a 0-1 scale.
 *
 * Looks at sorted unique values. For each pair of adjacent values:
 * - gap 1 (consecutive): +1
 * - gap 2: +0.5
 * - gap 3: +0.25
 *
 * Ace can also be low (value 1) for A-2-3-4-5 connectedness.
 * Normalize by dividing by (numUniqueValues - 1). Cap at 1.0.
 */
function calculateConnectedness(cards: Card[]): number {
    const values = cards.map(c => cardValue(c));

    // Build unique sorted values, including ace-low if ace is present
    const uniqueSet = new Set(values);
    if (uniqueSet.has(14)) {
        uniqueSet.add(1); // Ace can also be low
    }
    const sorted = [...uniqueSet].sort((a, b) => a - b);

    if (sorted.length <= 1) return 0;

    let score = 0;
    for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i] - sorted[i - 1];
        if (gap === 1) score += 1;
        else if (gap === 2) score += 0.5;
        else if (gap === 3) score += 0.25;
    }

    // Normalize by (number of original unique card values - 1), not counting
    // the synthetic ace-low. This keeps the denominator based on actual card count.
    const numOriginalUnique = new Set(values).size;
    if (numOriginalUnique <= 1) return 0;

    const normalized = score / (numOriginalUnique - 1);
    return Math.min(normalized, 1.0);
}

/**
 * Counts how many distinct 5-value straight windows contain at least 2
 * of the community card values.
 *
 * Windows: [1-5], [2-6], [3-7], ..., [10-14]
 * (A can be 1 or 14, so both ends are covered)
 */
function countPossibleStraights(cards: Card[]): number {
    const values = cards.map(c => cardValue(c));
    const valueSet = new Set(values);
    // Ace can also be low
    if (valueSet.has(14)) {
        valueSet.add(1);
    }

    let count = 0;
    // Windows from low=1 to low=10 (i.e., 1-5, 2-6, ..., 10-14)
    for (let low = 1; low <= 10; low++) {
        let hits = 0;
        for (let v = low; v < low + 5; v++) {
            if (valueSet.has(v)) hits++;
        }
        if (hits >= 2) count++;
    }

    return count;
}

/**
 * Wetness heuristic:
 * Score starts at 0:
 * +2 if isTwoTone
 * +3 if isMonotone
 * +1 per point of connectedness above 0.3 (i.e., floor((connectedness - 0.3) * 10) clamped ≥ 0 ... actually spec says "+1 per point", interpret as: add connectedness > 0.3 ? 1 : 0, but more naturally: add Math.floor(connectedness * 10) - 3 if positive)
 * Wait — re-reading spec: "+1 per point of connectedness above 0.3"
 * This likely means: if connectedness is 0.7, that's 0.4 above 0.3, which doesn't neatly produce integer points.
 * Reasonable interpretation: add Math.max(0, Math.round((connectedness - 0.3) * 10)) or simpler:
 * treat "per point" loosely — add 1 if connectedness > 0.3, add 2 if > 0.6, add 3 if > 0.9
 * Actually simplest reading: +1 for each 0.1 above 0.3 → Math.floor((connectedness - 0.3) / 0.1) capped at 0+
 *
 * Let's go with: Math.max(0, Math.floor((connectedness - 0.3) * 10))
 * So connectedness 0.5 → (0.2)*10 = 2 → +2
 *    connectedness 1.0 → (0.7)*10 = 7 → +7
 *    connectedness 0.3 → 0 → +0
 *
 * Hmm, that makes high connectedness dominate. Let's use a simpler interpretation from the spec:
 * "+1 per point of connectedness above 0.3" → treat it as adding the continuous value, then floor.
 * i.e., add floor(max(0, (connectedness - 0.3)) * 10 / 3) ... no, let me just do the simplest:
 *
 * The spec says:
 * +1 per point of connectedness above 0.3
 * +1 per highCard above 1
 * +1 per 2 possibleStraights
 *
 * So "per point" likely means each 1.0 unit, but connectedness is 0-1 range.
 * Since connectedness maxes at 1.0, that means at most +0.7 above 0.3.
 * That would mean this never contributes a full point — which seems wrong.
 *
 * Most sensible: treat connectedness as contributing continuously to the score.
 * score += max(0, connectedness - 0.3) * some_multiplier
 * Given the scale of other factors (2-3 range), a multiplier of ~3 makes sense.
 * But let's keep it simple and match the spec literally:
 * Just add (connectedness - 0.3) directly if > 0, contributing fractionally.
 * Then the total score gets floored when categorizing.
 *
 * Actually re-reading one more time: "+1 per point of connectedness above 0.3"
 * I think "point" here means 0.1 increments (like "basis points" style).
 * So: Math.max(0, Math.floor((connectedness - 0.3) * 10))
 */
function calculateWetness(params: {
    isMonotone: boolean;
    isTwoTone: boolean;
    isPaired: boolean;
    highCardCount: number;
    connectedness: number;
    possibleStraights: number;
}): BoardTexture['wetness'] {
    let score = 0;

    if (params.isTwoTone) score += 2;
    if (params.isMonotone) score += 3;
    score += Math.max(0, Math.floor((params.connectedness - 0.3) * 10));
    if (params.isPaired) score += 1;
    score += Math.max(0, params.highCardCount - 1);
    score += Math.floor(params.possibleStraights / 2);

    if (score <= 1) return 'dry';
    if (score <= 3) return 'semi-wet';
    if (score <= 5) return 'wet';
    return 'very-wet';
}
