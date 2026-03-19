import { describe, it, expect } from 'vitest';
import { analyzeBoard } from '../board';
import type { Card, Suit, Rank } from '../../../types/poker';

// Helper to create cards concisely
function card(rank: Rank, suit: Suit): Card {
    return { rank, suit };
}

// Shorthand helpers for suits
const h = (rank: Rank): Card => card(rank, 'hearts');
const d = (rank: Rank): Card => card(rank, 'diamonds');
const c = (rank: Rank): Card => card(rank, 'clubs');
const s = (rank: Rank): Card => card(rank, 'spades');

describe('analyzeBoard', () => {
    // ── 1. Empty board (preflop) ──────────────────────────────────────
    describe('preflop (no community cards)', () => {
        it('returns neutral texture', () => {
            const result = analyzeBoard([]);
            expect(result.wetness).toBe('dry');
            expect(result.isMonotone).toBe(false);
            expect(result.isTwoTone).toBe(false);
            expect(result.isRainbow).toBe(false);
            expect(result.isPaired).toBe(false);
            expect(result.isTrips).toBe(false);
            expect(result.highCardCount).toBe(0);
            expect(result.connectedness).toBe(0);
            expect(result.possibleStraights).toBe(0);
            expect(result.possibleFlushes).toBe(false);
        });
    });

    // ── 2. Rainbow dry flop ───────────────────────────────────────────
    describe('rainbow dry flop (K♠ 7♥ 2♣)', () => {
        const board = [s('K'), h('7'), c('2')];

        it('is rainbow', () => {
            const result = analyzeBoard(board);
            expect(result.isRainbow).toBe(true);
            expect(result.isMonotone).toBe(false);
            expect(result.isTwoTone).toBe(false);
        });

        it('is not paired', () => {
            expect(analyzeBoard(board).isPaired).toBe(false);
        });

        it('is dry', () => {
            expect(analyzeBoard(board).wetness).toBe('dry');
        });
    });

    // ── 3. Monotone flop ──────────────────────────────────────────────
    describe('monotone flop (A♥ K♥ Q♥)', () => {
        const board = [h('A'), h('K'), h('Q')];

        it('is monotone', () => {
            const result = analyzeBoard(board);
            expect(result.isMonotone).toBe(true);
            expect(result.isTwoTone).toBe(false);
            expect(result.isRainbow).toBe(false);
        });

        it('has possible flushes', () => {
            expect(analyzeBoard(board).possibleFlushes).toBe(true);
        });

        it('is wet or very-wet', () => {
            const result = analyzeBoard(board);
            expect(['wet', 'very-wet']).toContain(result.wetness);
        });
    });

    // ── 4. Two-tone flop ──────────────────────────────────────────────
    describe('two-tone flop (J♠ 10♠ 5♥)', () => {
        const board = [s('J'), s('10'), h('5')];

        it('is two-tone', () => {
            const result = analyzeBoard(board);
            expect(result.isTwoTone).toBe(true);
            expect(result.isMonotone).toBe(false);
            expect(result.isRainbow).toBe(false);
        });
    });

    // ── 5. Paired board ───────────────────────────────────────────────
    describe('paired board (K♠ K♥ 7♣)', () => {
        const board = [s('K'), h('K'), c('7')];

        it('is paired', () => {
            const result = analyzeBoard(board);
            expect(result.isPaired).toBe(true);
            expect(result.isTrips).toBe(false);
        });
    });

    // ── 6. Trips board ────────────────────────────────────────────────
    describe('trips board (7♠ 7♥ 7♣)', () => {
        const board = [s('7'), h('7'), c('7')];

        it('is trips and paired', () => {
            const result = analyzeBoard(board);
            expect(result.isTrips).toBe(true);
            expect(result.isPaired).toBe(true);
        });
    });

    // ── 7. Connected board ────────────────────────────────────────────
    describe('connected board (9♣ 10♠ J♥)', () => {
        const board = [c('9'), s('10'), h('J')];

        it('has high connectedness', () => {
            const result = analyzeBoard(board);
            // 9-10-11 are all consecutive: gap 1 + gap 1 = 2 points / 2 = 1.0
            expect(result.connectedness).toBe(1.0);
        });

        it('has significant possible straights', () => {
            const result = analyzeBoard(board);
            expect(result.possibleStraights).toBeGreaterThanOrEqual(3);
        });
    });

    // ── 8. Disconnected board ─────────────────────────────────────────
    describe('disconnected board (2♣ 7♠ K♥)', () => {
        const board = [c('2'), s('7'), h('K')];

        it('has low connectedness', () => {
            const result = analyzeBoard(board);
            expect(result.connectedness).toBeLessThanOrEqual(0.3);
        });
    });

    // ── 9. Broadway heavy board ───────────────────────────────────────
    describe('broadway heavy board (Q♠ J♥ 10♣)', () => {
        const board = [s('Q'), h('J'), c('10')];

        it('has high card count >= 3', () => {
            const result = analyzeBoard(board);
            expect(result.highCardCount).toBeGreaterThanOrEqual(3);
        });
    });

    describe('mixed broadway board (A♠ K♥ 4♣)', () => {
        it('has high card count >= 2', () => {
            const result = analyzeBoard([s('A'), h('K'), c('4')]);
            expect(result.highCardCount).toBeGreaterThanOrEqual(2);
        });
    });

    // ── 10. Turn board (4 community cards) ────────────────────────────
    describe('turn board (4 cards)', () => {
        const board = [s('A'), h('K'), c('7'), d('3')];

        it('analyzes correctly with 4 cards', () => {
            const result = analyzeBoard(board);
            // All 4 different suits → rainbow
            expect(result.isRainbow).toBe(true);
            expect(result.isPaired).toBe(false);
            expect(result.highCardCount).toBe(2); // A and K
            expect(result.possibleFlushes).toBe(false); // no 3+ of same suit
        });
    });

    describe('turn board with flush possibility', () => {
        const board = [h('A'), h('K'), h('7'), d('3')];

        it('detects possible flushes on turn', () => {
            const result = analyzeBoard(board);
            expect(result.possibleFlushes).toBe(true);
            expect(result.isRainbow).toBe(false);
        });
    });

    // ── 11. River board (5 community cards) ───────────────────────────
    describe('river board (5 cards)', () => {
        const board = [h('A'), s('K'), d('Q'), c('J'), h('10')];

        it('analyzes correctly with 5 cards', () => {
            const result = analyzeBoard(board);
            expect(result.highCardCount).toBe(5); // all broadway
            expect(result.connectedness).toBe(1.0); // all consecutive
            expect(result.isPaired).toBe(false);
        });
    });

    describe('river board with pair', () => {
        const board = [h('8'), s('8'), d('4'), c('4'), h('2')];

        it('detects paired on river', () => {
            const result = analyzeBoard(board);
            expect(result.isPaired).toBe(true);
            expect(result.isTrips).toBe(false);
        });
    });

    // ── 12. Wetness classification ────────────────────────────────────
    describe('wetness classification', () => {
        it('classifies dry board', () => {
            // K♠ 7♥ 2♣ — rainbow, disconnected, 1 high card
            const result = analyzeBoard([s('K'), h('7'), c('2')]);
            expect(result.wetness).toBe('dry');
        });

        it('classifies semi-wet board', () => {
            // K♠ K♥ 7♣ — paired, rainbow, some score
            const result = analyzeBoard([s('K'), h('K'), c('7')]);
            expect(['semi-wet', 'dry']).toContain(result.wetness);
        });

        it('classifies wet board', () => {
            // J♠ 10♠ 9♥ — two-tone, connected, high cards
            const result = analyzeBoard([s('J'), s('10'), h('9')]);
            expect(['wet', 'very-wet']).toContain(result.wetness);
        });

        it('classifies very-wet board', () => {
            // A♥ K♥ Q♥ — monotone, connected, broadway
            const result = analyzeBoard([h('A'), h('K'), h('Q')]);
            expect(result.wetness).toBe('very-wet');
        });
    });

    // ── Edge cases / additional coverage ──────────────────────────────
    describe('edge cases', () => {
        it('handles single card (unusual but valid)', () => {
            const result = analyzeBoard([h('A')]);
            expect(result.isMonotone).toBe(true);
            expect(result.highCardCount).toBe(1);
            expect(result.connectedness).toBe(0);
            expect(result.isPaired).toBe(false);
        });

        it('ace-low connectedness: A-2-3', () => {
            const board = [s('A'), h('2'), c('3')];
            const result = analyzeBoard(board);
            // Sorted unique with ace-low: 1,2,3,14
            // gaps: 1-2=1(+1), 2-3=1(+1), 3-14=11(+0) → score 2
            // numOriginalUnique = 3, normalize by 2 → 2/2 = 1.0
            expect(result.connectedness).toBe(1.0);
        });

        it('ace-high connectedness: Q-K-A', () => {
            const board = [s('Q'), h('K'), c('A')];
            const result = analyzeBoard(board);
            // Sorted unique with ace-low: 1,12,13,14
            // gaps: 1-12=11(+0), 12-13=1(+1), 13-14=1(+1) → score 2
            // numOriginalUnique = 3, normalize by 2 → 2/2 = 1.0
            expect(result.connectedness).toBe(1.0);
        });

        it('possibleStraights counts windows with at least 2 community card values', () => {
            // Board: 5♠ 6♥ — just 2 cards
            const board = [s('5'), h('6')];
            const result = analyzeBoard(board);
            // Values: 5, 6. Windows with both:
            // [1-5] has 5 → 1 hit
            // [2-6] has 5,6 → 2 hits ✓
            // [3-7] has 5,6 → 2 hits ✓
            // [4-8] has 5,6 → 2 hits ✓
            // [5-9] has 5,6 → 2 hits ✓
            // [6-10] has 6 → 1 hit
            // So 4 windows
            expect(result.possibleStraights).toBe(4);
        });

        it('monotone two-tone and rainbow are mutually exclusive', () => {
            // Monotone
            const mono = analyzeBoard([h('A'), h('K'), h('Q')]);
            expect(mono.isMonotone).toBe(true);
            expect(mono.isTwoTone).toBe(false);
            expect(mono.isRainbow).toBe(false);

            // Two-tone
            const twoTone = analyzeBoard([s('J'), s('10'), h('5')]);
            expect(twoTone.isMonotone).toBe(false);
            expect(twoTone.isTwoTone).toBe(true);
            expect(twoTone.isRainbow).toBe(false);

            // Rainbow
            const rainbow = analyzeBoard([s('K'), h('7'), c('2')]);
            expect(rainbow.isMonotone).toBe(false);
            expect(rainbow.isTwoTone).toBe(false);
            expect(rainbow.isRainbow).toBe(true);
        });
    });
});
