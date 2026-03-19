import { describe, it, expect } from 'vitest';
import { calculateEquity } from '../equity';
import type { Card, Rank, Suit } from '../../../types/poker';

// ── Helpers ─────────────────────────────────────────────────────────

function card(rank: Rank, suit: Suit): Card {
    return { rank, suit };
}

const h = (rank: Rank): Card => card(rank, 'hearts');
const d = (rank: Rank): Card => card(rank, 'diamonds');
const c = (rank: Rank): Card => card(rank, 'clubs');
const s = (rank: Rank): Card => card(rank, 'spades');

// Use higher sample count for more stable Monte Carlo results
const MC_SAMPLES = 3000;

describe('calculateEquity', () => {
    // ── 1. AA vs 1 opponent preflop ──────────────────────────────────
    describe('AA vs 1 opponent preflop', () => {
        it('should have equity ~0.80-0.87', () => {
            const holeCards = [s('A'), h('A')];
            const result = calculateEquity(holeCards, [], 1, MC_SAMPLES);

            expect(result.equity).toBeGreaterThanOrEqual(0.75);
            expect(result.equity).toBeLessThanOrEqual(0.92);
        });
    });

    // ── 2. 72o vs 1 opponent preflop ─────────────────────────────────
    describe('72o vs 1 opponent preflop', () => {
        it('should have equity ~0.30-0.45', () => {
            const holeCards = [s('7'), h('2')];
            const result = calculateEquity(holeCards, [], 1, MC_SAMPLES);

            expect(result.equity).toBeGreaterThanOrEqual(0.25);
            expect(result.equity).toBeLessThanOrEqual(0.50);
        });
    });

    // ── 3. Made nut flush on river ───────────────────────────────────
    describe('nut flush on river (5 community cards)', () => {
        it('should have very high equity (>0.85)', () => {
            // Hero has A♠ K♠ — nut flush in spades
            const holeCards = [s('A'), s('K')];
            const communityCards = [s('Q'), s('9'), s('4'), h('3'), d('8')];
            const result = calculateEquity(holeCards, communityCards, 1, MC_SAMPLES);

            expect(result.equity).toBeGreaterThan(0.85);
        });
    });

    // ── 4. Pocket pair vs overcards on flop ──────────────────────────
    describe('pocket pair vs overcards on flop (heads-up)', () => {
        it('should have reasonable equity range', () => {
            // Hero: 8♠ 8♥ on a low flop 3♣ 5♦ 7♥ — overpair to board
            const holeCards = [s('8'), h('8')];
            const communityCards = [c('3'), d('5'), h('7')];
            const result = calculateEquity(holeCards, communityCards, 1, MC_SAMPLES);

            // With an overpair on a low board, hero should have decent equity
            // Against a random hand, roughly 0.55-0.85
            expect(result.equity).toBeGreaterThanOrEqual(0.50);
            expect(result.equity).toBeLessThanOrEqual(0.90);
        });
    });

    // ── 5. Multiple opponents lower equity ───────────────────────────
    describe('multiple opponents', () => {
        it('equity with 3 opponents should be lower than heads-up for same hand', () => {
            const holeCards = [s('A'), h('K')];

            const headsUp = calculateEquity(holeCards, [], 1, MC_SAMPLES);
            const threeWay = calculateEquity(holeCards, [], 3, MC_SAMPLES);

            expect(threeWay.equity).toBeLessThan(headsUp.equity);
        });
    });

    // ── 6. Returns correct structure ─────────────────────────────────
    describe('result structure', () => {
        it('has all EquityResult fields populated', () => {
            const holeCards = [s('A'), h('A')];
            const result = calculateEquity(holeCards, [], 1, 500);

            expect(result).toHaveProperty('equity');
            expect(result).toHaveProperty('samples');
            expect(result).toHaveProperty('wins');
            expect(result).toHaveProperty('ties');
            expect(result).toHaveProperty('losses');

            expect(typeof result.equity).toBe('number');
            expect(typeof result.samples).toBe('number');
            expect(typeof result.wins).toBe('number');
            expect(typeof result.ties).toBe('number');
            expect(typeof result.losses).toBe('number');
        });
    });

    // ── 7. wins + ties + losses = samples ────────────────────────────
    describe('result consistency', () => {
        it('wins + ties + losses should equal samples', () => {
            const holeCards = [s('A'), h('K')];
            const sampleSize = 1500;
            const result = calculateEquity(holeCards, [], 2, sampleSize);

            expect(result.wins + result.ties + result.losses).toBe(sampleSize);
            expect(result.samples).toBe(sampleSize);
        });
    });

    // ── 8. Edge case: no community cards (preflop) ───────────────────
    describe('no community cards (preflop)', () => {
        it('should still work and return valid results', () => {
            const holeCards = [s('K'), h('Q')];
            const result = calculateEquity(holeCards, [], 1, MC_SAMPLES);

            expect(result.equity).toBeGreaterThan(0);
            expect(result.equity).toBeLessThan(1);
            expect(result.wins + result.ties + result.losses).toBe(MC_SAMPLES);
        });
    });

    // ── 9. Custom sample size ────────────────────────────────────────
    describe('custom sample size', () => {
        it('uses specified sample count', () => {
            const holeCards = [s('A'), h('A')];
            const customSamples = 200;
            const result = calculateEquity(holeCards, [], 1, customSamples);

            expect(result.samples).toBe(customSamples);
            expect(result.wins + result.ties + result.losses).toBe(customSamples);
        });

        it('uses default of 1000 when not specified', () => {
            const holeCards = [s('A'), h('A')];
            const result = calculateEquity(holeCards, [], 1);

            expect(result.samples).toBe(1000);
        });
    });
});
