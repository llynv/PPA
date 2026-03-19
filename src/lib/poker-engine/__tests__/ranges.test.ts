import { describe, it, expect } from 'vitest';
import type { Card, Position } from '../../../types/poker';
import {
  toHandCombo,
  getPositionRanges,
  isInRange,
  getAllHandCombos,
} from '../ranges';

// ── Helper to build Card objects ────────────────────────────────────

function card(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit };
}

// ── toHandCombo ─────────────────────────────────────────────────────

describe('toHandCombo', () => {
  it('converts a pair of aces to "AA"', () => {
    expect(toHandCombo([card('A', 'spades'), card('A', 'hearts')])).toBe('AA');
  });

  it('converts suited AK to "AKs"', () => {
    expect(
      toHandCombo([card('A', 'spades'), card('K', 'spades')]),
    ).toBe('AKs');
  });

  it('converts offsuit AK to "AKo"', () => {
    expect(
      toHandCombo([card('A', 'hearts'), card('K', 'clubs')]),
    ).toBe('AKo');
  });

  it('converts pair of 10s to "TT"', () => {
    expect(
      toHandCombo([card('10', 'spades'), card('10', 'hearts')]),
    ).toBe('TT');
  });

  it('converts suited connectors 9♠8♠ to "98s"', () => {
    expect(
      toHandCombo([card('9', 'spades'), card('8', 'spades')]),
    ).toBe('98s');
  });

  it('is order-independent — K♠ A♠ still produces "AKs"', () => {
    expect(
      toHandCombo([card('K', 'spades'), card('A', 'spades')]),
    ).toBe('AKs');
  });

  it('is order-independent — 7♣ J♦ produces "J7o"', () => {
    expect(
      toHandCombo([card('7', 'clubs'), card('J', 'diamonds')]),
    ).toBe('J7o');
  });

  it('converts 10 and A suited to "ATs"', () => {
    expect(
      toHandCombo([card('10', 'hearts'), card('A', 'hearts')]),
    ).toBe('ATs');
  });

  it('converts offsuit low cards 7♥ 2♣ to "72o"', () => {
    expect(
      toHandCombo([card('7', 'hearts'), card('2', 'clubs')]),
    ).toBe('72o');
  });

  it('throws for wrong number of cards', () => {
    expect(() => toHandCombo([])).toThrow('exactly 2 cards');
    expect(() =>
      toHandCombo([card('A', 'spades'), card('K', 'spades'), card('Q', 'spades')]),
    ).toThrow('exactly 2 cards');
  });
});

// ── getPositionRanges ───────────────────────────────────────────────

describe('getPositionRanges', () => {
  const ALL_POSITIONS: Position[] = [
    'UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB',
  ];

  it('AA is in every position\'s open-raise range', () => {
    for (const pos of ALL_POSITIONS) {
      const ranges = getPositionRanges(pos);
      expect(ranges.openRaise.has('AA')).toBe(true);
    }
  });

  it('72o is NOT in any position\'s open-raise range', () => {
    for (const pos of ALL_POSITIONS) {
      const ranges = getPositionRanges(pos);
      expect(ranges.openRaise.has('72o')).toBe(false);
    }
  });

  it('UTG has smallest open-raise range', () => {
    const utgSize = getPositionRanges('UTG').openRaise.size;
    for (const pos of ALL_POSITIONS) {
      if (pos === 'UTG') continue;
      expect(getPositionRanges(pos).openRaise.size).toBeGreaterThanOrEqual(utgSize);
    }
  });

  it('BTN has the largest open-raise range (among non-BB positions)', () => {
    const btnSize = getPositionRanges('BTN').openRaise.size;
    // BTN should be at least as large as every other non-BB position
    for (const pos of ['UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO', 'SB'] as Position[]) {
      expect(btnSize).toBeGreaterThanOrEqual(getPositionRanges(pos).openRaise.size);
    }
  });

  it('open-raise range sizes increase monotonically UTG → BTN', () => {
    const earlyToLate: Position[] = ['UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO', 'BTN'];
    for (let i = 1; i < earlyToLate.length; i++) {
      const prev = getPositionRanges(earlyToLate[i - 1]).openRaise.size;
      const curr = getPositionRanges(earlyToLate[i]).openRaise.size;
      expect(curr).toBeGreaterThan(prev);
    }
  });

  it('3-bet range is a subset of (or smaller than) open-raise range for each position', () => {
    for (const pos of ALL_POSITIONS) {
      const ranges = getPositionRanges(pos);
      expect(ranges.threeBet.size).toBeLessThanOrEqual(ranges.openRaise.size);

      // Every 3-bet hand should also be in the open-raise range
      // (3-bet hands are a subset of hands you'd play)
      for (const hand of ranges.threeBet) {
        expect(ranges.openRaise.has(hand)).toBe(true);
      }
    }
  });

  it('all positions return valid PositionRanges objects with all Set fields populated', () => {
    for (const pos of ALL_POSITIONS) {
      const ranges = getPositionRanges(pos);
      expect(ranges.openRaise).toBeInstanceOf(Set);
      expect(ranges.threeBet).toBeInstanceOf(Set);
      expect(ranges.callOpen).toBeInstanceOf(Set);
      expect(ranges.call3Bet).toBeInstanceOf(Set);
      expect(ranges.fourBet).toBeInstanceOf(Set);

      expect(ranges.openRaise.size).toBeGreaterThan(0);
      expect(ranges.threeBet.size).toBeGreaterThan(0);
      expect(ranges.callOpen.size).toBeGreaterThan(0);
      expect(ranges.call3Bet.size).toBeGreaterThan(0);
      expect(ranges.fourBet.size).toBeGreaterThan(0);
    }
  });

  it('callOpen is the set difference of openRaise minus threeBet', () => {
    for (const pos of ALL_POSITIONS) {
      const ranges = getPositionRanges(pos);
      for (const hand of ranges.callOpen) {
        expect(ranges.openRaise.has(hand)).toBe(true);
        expect(ranges.threeBet.has(hand)).toBe(false);
      }
      // callOpen + threeBet should cover openRaise
      expect(ranges.callOpen.size + ranges.threeBet.size).toBe(ranges.openRaise.size);
    }
  });

  it('fourBet range contains AA and KK for all positions', () => {
    for (const pos of ALL_POSITIONS) {
      const ranges = getPositionRanges(pos);
      expect(ranges.fourBet.has('AA')).toBe(true);
      expect(ranges.fourBet.has('KK')).toBe(true);
    }
  });
});

// ── getAllHandCombos ─────────────────────────────────────────────────

describe('getAllHandCombos', () => {
  it('returns exactly 169 combos', () => {
    const combos = getAllHandCombos();
    expect(combos).toHaveLength(169);
  });

  it('contains no duplicates', () => {
    const combos = getAllHandCombos();
    const unique = new Set(combos);
    expect(unique.size).toBe(169);
  });

  it('includes representative hands from each category', () => {
    const combos = new Set(getAllHandCombos());
    // Pairs
    expect(combos.has('AA')).toBe(true);
    expect(combos.has('22')).toBe(true);
    expect(combos.has('TT')).toBe(true);
    // Suited
    expect(combos.has('AKs')).toBe(true);
    expect(combos.has('32s')).toBe(true);
    expect(combos.has('T9s')).toBe(true);
    // Offsuit
    expect(combos.has('AKo')).toBe(true);
    expect(combos.has('72o')).toBe(true);
    expect(combos.has('T9o')).toBe(true);
  });

  it('has exactly 13 pairs, 78 suited, 78 offsuit', () => {
    const combos = getAllHandCombos();
    const pairs = combos.filter((c) => c.length === 2);
    const suited = combos.filter((c) => c.endsWith('s'));
    const offsuit = combos.filter((c) => c.endsWith('o'));

    expect(pairs).toHaveLength(13);
    expect(suited).toHaveLength(78);
    expect(offsuit).toHaveLength(78);
  });
});

// ── isInRange ───────────────────────────────────────────────────────

describe('isInRange', () => {
  it('returns true when the hand is in the range', () => {
    const range = new Set(['AA', 'KK', 'AKs']);
    expect(isInRange('AA', range)).toBe(true);
    expect(isInRange('AKs', range)).toBe(true);
  });

  it('returns false when the hand is not in the range', () => {
    const range = new Set(['AA', 'KK', 'AKs']);
    expect(isInRange('72o', range)).toBe(false);
    expect(isInRange('QJo', range)).toBe(false);
  });

  it('works with actual position ranges', () => {
    const utgRanges = getPositionRanges('UTG');
    expect(isInRange('AA', utgRanges.openRaise)).toBe(true);
    expect(isInRange('72o', utgRanges.openRaise)).toBe(false);
  });
});
