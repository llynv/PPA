import type { Card, EquityResult } from '../../types/poker';
import { compareHands } from '../evaluator';
import { SUITS, RANKS } from '../deck';

// ── Helpers ─────────────────────────────────────────────────────────

/** Builds a full 52-card deck. */
function buildFullDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    return deck;
}

/** Returns true if two cards are identical (same suit AND rank). */
function isSameCard(a: Card, b: Card): boolean {
    return a.suit === b.suit && a.rank === b.rank;
}

/** Fisher-Yates shuffle in place. Mutates the array. */
function shuffleInPlace(arr: Card[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// ── Main ────────────────────────────────────────────────────────────

/**
 * Calculates equity via Monte Carlo simulation.
 *
 * Given hero's hole cards, known community cards, and number of opponents:
 * 1. Remove known cards from a full 52-card deck
 * 2. For each simulation:
 *    a. Shuffle remaining cards
 *    b. Deal random hole cards to each opponent (2 each)
 *    c. Deal remaining community cards (to complete 5)
 *    d. Compare hero's hand against each opponent
 *    e. Hero wins if they beat ALL opponents (or ties with best)
 * 3. Return equity = (wins + ties/numTiedPlayers) / totalSamples
 *
 * @param holeCards - Hero's 2 hole cards
 * @param communityCards - Known community cards (0-5)
 * @param numOpponents - Number of opponents (1-8)
 * @param samples - Number of simulations (default 1000)
 */
export function calculateEquity(
    holeCards: Card[],
    communityCards: Card[],
    numOpponents: number,
    samples: number = 1000,
): EquityResult {
    // Build remaining deck by filtering out known cards
    const knownCards = [...holeCards, ...communityCards];
    const remaining = buildFullDeck().filter(
        (card) => !knownCards.some((known) => isSameCard(card, known)),
    );

    const communityCardsNeeded = 5 - communityCards.length;

    let wins = 0;
    let ties = 0;
    let losses = 0;

    for (let i = 0; i < samples; i++) {
        // Shuffle a copy of remaining cards
        const shuffled = [...remaining];
        shuffleInPlace(shuffled);

        let dealIndex = 0;

        // Deal 2 hole cards per opponent
        const opponentHands: Card[][] = [];
        for (let opp = 0; opp < numOpponents; opp++) {
            opponentHands.push([shuffled[dealIndex], shuffled[dealIndex + 1]]);
            dealIndex += 2;
        }

        // Deal remaining community cards
        const fullCommunity = [
            ...communityCards,
            ...shuffled.slice(dealIndex, dealIndex + communityCardsNeeded),
        ];

        // Build hero's full hand
        const heroHand = [...holeCards, ...fullCommunity];

        // Compare hero vs each opponent
        let heroWinsAll = true;
        let heroTied = false;

        for (let opp = 0; opp < numOpponents; opp++) {
            const oppHand = [...opponentHands[opp], ...fullCommunity];
            const result = compareHands(heroHand, oppHand);

            if (result < 0) {
                // Hero loses to this opponent
                heroWinsAll = false;
                heroTied = false;
                break;
            } else if (result === 0) {
                // Hero ties with this opponent
                heroTied = true;
            }
        }

        if (!heroWinsAll) {
            losses++;
        } else if (heroTied) {
            ties++;
        } else {
            wins++;
        }
    }

    // Equity: wins count full, ties count fractional
    // For ties, the pot is split, so each tied player gets 1/numTiedPlayers share
    // Simple approximation: ties count as 0.5 (standard in HU), for multi-way
    // a tie with N players sharing = 1/N but we don't track exactly how many
    // tied — we use the standard convention of counting ties as half a win
    const equity = (wins + ties * 0.5) / samples;

    return {
        equity,
        samples,
        wins,
        ties,
        losses,
    };
}
