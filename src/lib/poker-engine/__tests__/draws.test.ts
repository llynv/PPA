import { describe, it, expect } from 'vitest';
import { detectDraws } from '../draws';
import type { Card } from '../../../types/poker';

// Helper to create cards concisely
function card(rank: Card['rank'], suit: Card['suit']): Card {
    return { rank, suit };
}

describe('detectDraws', () => {
    // ─── 1. No draw (dry rainbow board) ────────────────────────────────
    describe('no draws', () => {
        it('returns all false on a dry rainbow board', () => {
            const hole: Card[] = [card('2', 'clubs'), card('4', 'diamonds')];
            const board: Card[] = [
                card('K', 'spades'),
                card('7', 'hearts'),
                card('2', 'diamonds'),
            ];
            const result = detectDraws(hole, board);

            expect(result.flushDraw).toBe(false);
            expect(result.flushDrawOuts).toBe(0);
            expect(result.oesD).toBe(false);
            expect(result.gutshot).toBe(false);
            expect(result.straightDrawOuts).toBe(0);
            expect(result.backdoorFlush).toBe(false);
            expect(result.backdoorStraight).toBe(false);
            expect(result.totalOuts).toBe(0);
            expect(result.drawEquity).toBe(0);
        });
    });

    // ─── 2. Flush draw ─────────────────────────────────────────────────
    describe('flush draw', () => {
        it('detects flush draw when 4 hearts and hero has at least 1', () => {
            const hole: Card[] = [card('A', 'hearts'), card('K', 'hearts')];
            const board: Card[] = [
                card('5', 'hearts'),
                card('8', 'hearts'),
                card('J', 'clubs'),
            ];
            const result = detectDraws(hole, board);

            expect(result.flushDraw).toBe(true);
            expect(result.flushDrawOuts).toBe(9);
        });

        it('does NOT detect flush draw when hero has no cards of the flush suit', () => {
            // Board has 4 hearts but hero has none
            const hole: Card[] = [card('A', 'clubs'), card('K', 'spades')];
            const board: Card[] = [
                card('5', 'hearts'),
                card('8', 'hearts'),
                card('J', 'hearts'),
                card('2', 'hearts'),
            ];
            const result = detectDraws(hole, board);

            expect(result.flushDraw).toBe(false);
            expect(result.flushDrawOuts).toBe(0);
        });
    });

    // ─── 3. OESD ───────────────────────────────────────────────────────
    describe('open-ended straight draw (OESD)', () => {
        it('detects OESD with 9-10 in hand and J-8 on board', () => {
            const hole: Card[] = [card('9', 'clubs'), card('10', 'diamonds')];
            const board: Card[] = [
                card('J', 'spades'),
                card('8', 'hearts'),
                card('2', 'clubs'),
            ];
            const result = detectDraws(hole, board);

            expect(result.oesD).toBe(true);
            expect(result.straightDrawOuts).toBe(8);
        });

        it('detects OESD with 5-6 in hand and 7-8 on board', () => {
            const hole: Card[] = [card('5', 'hearts'), card('6', 'diamonds')];
            const board: Card[] = [
                card('7', 'spades'),
                card('8', 'clubs'),
                card('K', 'hearts'),
            ];
            const result = detectDraws(hole, board);

            expect(result.oesD).toBe(true);
            expect(result.straightDrawOuts).toBe(8);
        });
    });

    // ─── 4. Gutshot ────────────────────────────────────────────────────
    describe('gutshot', () => {
        it('detects gutshot with 9-6 in hand and 7-10 on board (needs 8)', () => {
            const hole: Card[] = [card('9', 'clubs'), card('6', 'diamonds')];
            const board: Card[] = [
                card('7', 'spades'),
                card('10', 'hearts'),
                card('2', 'clubs'),
            ];
            const result = detectDraws(hole, board);

            // Values: 2, 6, 7, 9, 10. Window 6-10: {6,7,9,10} = 4 with gap at 8 → gutshot
            expect(result.gutshot).toBe(true);
            expect(result.oesD).toBe(false);
            expect(result.straightDrawOuts).toBe(4);
        });

        it('detects gutshot with A-K and Q-10 on board (broadway)', () => {
            const hole: Card[] = [card('A', 'clubs'), card('K', 'diamonds')];
            const board: Card[] = [
                card('Q', 'spades'),
                card('10', 'hearts'),
                card('3', 'clubs'),
            ];
            const result = detectDraws(hole, board);

            // A-K-Q-10 is 4 consecutive (10-J-Q-K-A window, missing J) → gutshot
            expect(result.gutshot).toBe(true);
        });
    });

    // ─── 5. Combo draw (flush + straight) ──────────────────────────────
    describe('combo draw', () => {
        it('detects both flush draw and OESD', () => {
            // Flush draw: 4 hearts; OESD: 8-9-10-J
            const hole: Card[] = [card('9', 'hearts'), card('10', 'hearts')];
            const board: Card[] = [
                card('J', 'hearts'),
                card('8', 'hearts'),
                card('2', 'clubs'),
            ];
            const result = detectDraws(hole, board);

            expect(result.flushDraw).toBe(true);
            expect(result.flushDrawOuts).toBe(9);
            expect(result.oesD).toBe(true);
            expect(result.straightDrawOuts).toBe(8);
            // Combo: 9 + 8 - 1 = 16 total outs
            expect(result.totalOuts).toBe(16);
        });

        it('combo draw totalOuts subtracts 1 for overlap', () => {
            const hole: Card[] = [card('6', 'hearts'), card('7', 'hearts')];
            const board: Card[] = [
                card('8', 'hearts'),
                card('9', 'hearts'),
                card('K', 'clubs'),
            ];
            const result = detectDraws(hole, board);

            expect(result.flushDraw).toBe(true);
            expect(result.oesD).toBe(true);
            expect(result.totalOuts).toBe(9 + 8 - 1); // 16
        });
    });

    // ─── 6. Backdoor flush ─────────────────────────────────────────────
    describe('backdoor flush', () => {
        it('detects backdoor flush on flop with 3 suited cards', () => {
            const hole: Card[] = [card('A', 'hearts'), card('K', 'clubs')];
            const board: Card[] = [
                card('5', 'hearts'),
                card('8', 'hearts'),
                card('J', 'clubs'),
            ];
            const result = detectDraws(hole, board);

            // 3 hearts total (A♥ + 5♥ + 8♥), hero has A♥
            expect(result.backdoorFlush).toBe(true);
        });

        it('does NOT detect backdoor flush on turn', () => {
            const hole: Card[] = [card('A', 'hearts'), card('K', 'clubs')];
            const board: Card[] = [
                card('5', 'hearts'),
                card('8', 'hearts'),
                card('J', 'clubs'),
                card('2', 'diamonds'),
            ];
            const result = detectDraws(hole, board);

            expect(result.backdoorFlush).toBe(false);
        });

        it('does NOT detect backdoor flush without hero contributing', () => {
            const hole: Card[] = [card('A', 'clubs'), card('K', 'clubs')];
            const board: Card[] = [
                card('5', 'hearts'),
                card('8', 'hearts'),
                card('J', 'hearts'),
            ];
            const result = detectDraws(hole, board);

            // Board has 3 hearts but hero has none
            expect(result.backdoorFlush).toBe(false);
        });
    });

    // ─── 7. Backdoor straight ──────────────────────────────────────────
    describe('backdoor straight', () => {
        it('detects backdoor straight on flop with 3 connected cards', () => {
            const hole: Card[] = [card('9', 'clubs'), card('2', 'diamonds')];
            const board: Card[] = [
                card('J', 'spades'),
                card('Q', 'hearts'),
                card('4', 'clubs'),
            ];
            const result = detectDraws(hole, board);

            // 9-J-Q are within a span of 5 (9-10-11-12-13)
            expect(result.backdoorStraight).toBe(true);
        });

        it('does NOT detect backdoor straight on turn', () => {
            const hole: Card[] = [card('9', 'clubs'), card('2', 'diamonds')];
            const board: Card[] = [
                card('J', 'spades'),
                card('Q', 'hearts'),
                card('4', 'clubs'),
                card('3', 'hearts'),
            ];
            const result = detectDraws(hole, board);

            expect(result.backdoorStraight).toBe(false);
        });
    });

    // ─── 8. River (5 community cards) ──────────────────────────────────
    describe('river', () => {
        it('drawEquity is 0 on the river', () => {
            const hole: Card[] = [card('A', 'hearts'), card('K', 'hearts')];
            const board: Card[] = [
                card('5', 'hearts'),
                card('8', 'hearts'),
                card('J', 'clubs'),
                card('3', 'diamonds'),
                card('2', 'spades'),
            ];
            const result = detectDraws(hole, board);

            expect(result.drawEquity).toBe(0);
        });
    });

    // ─── 9. Preflop (0 community cards) ────────────────────────────────
    describe('preflop', () => {
        it('returns all false with 0 community cards', () => {
            const hole: Card[] = [card('A', 'hearts'), card('K', 'hearts')];
            const result = detectDraws(hole, []);

            expect(result.flushDraw).toBe(false);
            expect(result.oesD).toBe(false);
            expect(result.gutshot).toBe(false);
            expect(result.backdoorFlush).toBe(false);
            expect(result.backdoorStraight).toBe(false);
            expect(result.totalOuts).toBe(0);
            expect(result.drawEquity).toBe(0);
        });

        it('returns all false with 1 community card', () => {
            const hole: Card[] = [card('A', 'hearts'), card('K', 'hearts')];
            const result = detectDraws(hole, [card('5', 'hearts')]);

            expect(result.flushDraw).toBe(false);
            expect(result.totalOuts).toBe(0);
        });

        it('returns all false with 2 community cards', () => {
            const hole: Card[] = [card('A', 'hearts'), card('K', 'hearts')];
            const result = detectDraws(hole, [
                card('5', 'hearts'),
                card('8', 'hearts'),
            ]);

            expect(result.flushDraw).toBe(false);
            expect(result.totalOuts).toBe(0);
        });
    });

    // ─── 10. Wheel draws (A-2-3-4 patterns) ───────────────────────────
    describe('wheel draws', () => {
        it('detects gutshot with A-2-3-4 (needs 5)', () => {
            const hole: Card[] = [card('A', 'clubs'), card('2', 'diamonds')];
            const board: Card[] = [
                card('3', 'spades'),
                card('4', 'hearts'),
                card('K', 'clubs'),
            ];
            const result = detectDraws(hole, board);

            // A-2-3-4 is 4 consecutive at the bottom — only one end (needs 5)
            // This should be a gutshot (only 1 card completes it)
            expect(result.gutshot).toBe(true);
            expect(result.straightDrawOuts).toBe(4);
        });

        it('detects gutshot for A-3-4-5 (needs 2)', () => {
            const hole: Card[] = [card('A', 'clubs'), card('3', 'diamonds')];
            const board: Card[] = [
                card('4', 'spades'),
                card('5', 'hearts'),
                card('K', 'clubs'),
            ];
            const result = detectDraws(hole, board);

            // A(1)-3-4-5 within window 1-5, missing 2 → gutshot
            expect(result.gutshot).toBe(true);
        });

        it('detects OESD with 2-3-4-5 (can complete with A or 6)', () => {
            const hole: Card[] = [card('4', 'clubs'), card('5', 'diamonds')];
            const board: Card[] = [
                card('2', 'spades'),
                card('3', 'hearts'),
                card('K', 'clubs'),
            ];
            const result = detectDraws(hole, board);

            // 2-3-4-5: needs A(low) or 6 — this is OESD
            expect(result.oesD).toBe(true);
            expect(result.straightDrawOuts).toBe(8);
        });
    });

    // ─── 11. Draw equity calculation ───────────────────────────────────
    describe('drawEquity calculation', () => {
        it('applies rule of 4 on flop (3 community cards)', () => {
            // Flush draw with 9 outs on flop
            const hole: Card[] = [card('A', 'hearts'), card('K', 'hearts')];
            const board: Card[] = [
                card('5', 'hearts'),
                card('8', 'hearts'),
                card('J', 'clubs'),
            ];
            const result = detectDraws(hole, board);

            // 9 outs * 4 / 100 = 0.36
            expect(result.drawEquity).toBe(0.36);
        });

        it('applies rule of 2 on turn (4 community cards)', () => {
            // Flush draw with 9 outs on turn
            const hole: Card[] = [card('A', 'hearts'), card('K', 'hearts')];
            const board: Card[] = [
                card('5', 'hearts'),
                card('8', 'hearts'),
                card('J', 'clubs'),
                card('3', 'diamonds'),
            ];
            const result = detectDraws(hole, board);

            // 9 outs * 2 / 100 = 0.18
            expect(result.drawEquity).toBe(0.18);
        });

        it('OESD on flop: 8 outs → equity = 0.32', () => {
            const hole: Card[] = [card('9', 'clubs'), card('10', 'diamonds')];
            const board: Card[] = [
                card('J', 'spades'),
                card('8', 'hearts'),
                card('2', 'clubs'),
            ];
            const result = detectDraws(hole, board);

            // 8 outs * 4 / 100 = 0.32
            expect(result.drawEquity).toBe(0.32);
        });

        it('gutshot on turn: 4 outs → equity = 0.08', () => {
            const hole: Card[] = [card('9', 'clubs'), card('6', 'diamonds')];
            const board: Card[] = [
                card('7', 'spades'),
                card('10', 'hearts'),
                card('2', 'clubs'),
                card('K', 'diamonds'),
            ];
            const result = detectDraws(hole, board);

            // Values: 2, 6, 7, 9, 10, 13. Window 6-10: {6,7,9,10} → gutshot
            // 4 outs * 2 / 100 = 0.08
            expect(result.gutshot).toBe(true);
            expect(result.drawEquity).toBe(0.08);
        });
    });

    // ─── Edge cases ────────────────────────────────────────────────────
    describe('edge cases', () => {
        it('does not flag OESD when a made straight already exists', () => {
            // 7-8-9-10-J → made straight, not a draw
            const hole: Card[] = [card('9', 'clubs'), card('10', 'diamonds')];
            const board: Card[] = [
                card('7', 'spades'),
                card('8', 'hearts'),
                card('J', 'clubs'),
            ];
            const result = detectDraws(hole, board);

            expect(result.oesD).toBe(false);
        });

        it('broadway gutshot: J-Q-K-A (needs 10)', () => {
            const hole: Card[] = [card('A', 'clubs'), card('K', 'diamonds')];
            const board: Card[] = [
                card('J', 'spades'),
                card('Q', 'hearts'),
                card('3', 'clubs'),
            ];
            const result = detectDraws(hole, board);

            // J-Q-K-A: 4 consecutive but A is capped → gutshot
            expect(result.gutshot).toBe(true);
            expect(result.straightDrawOuts).toBe(4);
        });

        it('non-overlapping outs when only flush draw (no straight draw)', () => {
            const hole: Card[] = [card('A', 'hearts'), card('K', 'hearts')];
            const board: Card[] = [
                card('5', 'hearts'),
                card('8', 'hearts'),
                card('J', 'clubs'),
            ];
            const result = detectDraws(hole, board);

            expect(result.totalOuts).toBe(9); // Just flush outs, no overlap subtraction
        });
    });
});
