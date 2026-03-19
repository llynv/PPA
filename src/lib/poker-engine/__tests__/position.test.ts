import { describe, it, expect } from 'vitest';
import { getPosition, getPositionOrder, getPositionCategory } from '../position';

describe('getPosition', () => {
  describe('heads-up (2 players)', () => {
    it('dealer (offset 0) is SB', () => {
      expect(getPosition(0, 0, 2)).toBe('SB');
    });

    it('non-dealer (offset 1) is BB', () => {
      expect(getPosition(1, 0, 2)).toBe('BB');
    });

    it('works when dealer is seat 1', () => {
      expect(getPosition(1, 1, 2)).toBe('SB');
      expect(getPosition(0, 1, 2)).toBe('BB');
    });
  });

  describe('3-player table', () => {
    it('assigns BTN, SB, BB correctly from dealer at seat 0', () => {
      expect(getPosition(0, 0, 3)).toBe('BTN');
      expect(getPosition(1, 0, 3)).toBe('SB');
      expect(getPosition(2, 0, 3)).toBe('BB');
    });

    it('wraps around when dealer is at seat 2', () => {
      expect(getPosition(2, 2, 3)).toBe('BTN');
      expect(getPosition(0, 2, 3)).toBe('SB');
      expect(getPosition(1, 2, 3)).toBe('BB');
    });
  });

  describe('6-player table', () => {
    it('assigns all 6 positions correctly', () => {
      // BTN, SB, BB, UTG, HJ, CO
      expect(getPosition(0, 0, 6)).toBe('BTN');
      expect(getPosition(1, 0, 6)).toBe('SB');
      expect(getPosition(2, 0, 6)).toBe('BB');
      expect(getPosition(3, 0, 6)).toBe('UTG');
      expect(getPosition(4, 0, 6)).toBe('HJ');
      expect(getPosition(5, 0, 6)).toBe('CO');
    });

    it('wraps correctly with dealer at seat 3', () => {
      expect(getPosition(3, 3, 6)).toBe('BTN');
      expect(getPosition(4, 3, 6)).toBe('SB');
      expect(getPosition(5, 3, 6)).toBe('BB');
      expect(getPosition(0, 3, 6)).toBe('UTG');
      expect(getPosition(1, 3, 6)).toBe('HJ');
      expect(getPosition(2, 3, 6)).toBe('CO');
    });
  });

  describe('9-player (full table)', () => {
    it('assigns all 9 positions correctly', () => {
      // BTN, SB, BB, UTG, UTG1, MP, LJ, HJ, CO
      expect(getPosition(0, 0, 9)).toBe('BTN');
      expect(getPosition(1, 0, 9)).toBe('SB');
      expect(getPosition(2, 0, 9)).toBe('BB');
      expect(getPosition(3, 0, 9)).toBe('UTG');
      expect(getPosition(4, 0, 9)).toBe('UTG1');
      expect(getPosition(5, 0, 9)).toBe('MP');
      expect(getPosition(6, 0, 9)).toBe('LJ');
      expect(getPosition(7, 0, 9)).toBe('HJ');
      expect(getPosition(8, 0, 9)).toBe('CO');
    });

    it('wraps around when dealer is at seat 5', () => {
      expect(getPosition(5, 5, 9)).toBe('BTN');
      expect(getPosition(6, 5, 9)).toBe('SB');
      expect(getPosition(7, 5, 9)).toBe('BB');
      expect(getPosition(8, 5, 9)).toBe('UTG');
      expect(getPosition(0, 5, 9)).toBe('UTG1');
      expect(getPosition(1, 5, 9)).toBe('MP');
      expect(getPosition(2, 5, 9)).toBe('LJ');
      expect(getPosition(3, 5, 9)).toBe('HJ');
      expect(getPosition(4, 5, 9)).toBe('CO');
    });
  });

  describe('wrap-around edge cases', () => {
    it('dealer at last seat (seat 8 in 9-player)', () => {
      expect(getPosition(8, 8, 9)).toBe('BTN');
      expect(getPosition(0, 8, 9)).toBe('SB');
      expect(getPosition(1, 8, 9)).toBe('BB');
      expect(getPosition(2, 8, 9)).toBe('UTG');
      expect(getPosition(7, 8, 9)).toBe('CO');
    });

    it('dealer at seat 0 (no wrap needed)', () => {
      expect(getPosition(0, 0, 9)).toBe('BTN');
      expect(getPosition(8, 0, 9)).toBe('CO');
    });

    it('dealer at last seat in 6-player', () => {
      expect(getPosition(5, 5, 6)).toBe('BTN');
      expect(getPosition(0, 5, 6)).toBe('SB');
      expect(getPosition(1, 5, 6)).toBe('BB');
      expect(getPosition(4, 5, 6)).toBe('CO');
    });
  });

  describe('other table sizes', () => {
    it('4-player: BTN, SB, BB, CO', () => {
      expect(getPosition(0, 0, 4)).toBe('BTN');
      expect(getPosition(1, 0, 4)).toBe('SB');
      expect(getPosition(2, 0, 4)).toBe('BB');
      expect(getPosition(3, 0, 4)).toBe('CO');
    });

    it('5-player: BTN, SB, BB, UTG, CO', () => {
      expect(getPosition(0, 0, 5)).toBe('BTN');
      expect(getPosition(1, 0, 5)).toBe('SB');
      expect(getPosition(2, 0, 5)).toBe('BB');
      expect(getPosition(3, 0, 5)).toBe('UTG');
      expect(getPosition(4, 0, 5)).toBe('CO');
    });

    it('7-player: BTN, SB, BB, UTG, LJ, HJ, CO', () => {
      expect(getPosition(0, 0, 7)).toBe('BTN');
      expect(getPosition(3, 0, 7)).toBe('UTG');
      expect(getPosition(4, 0, 7)).toBe('LJ');
      expect(getPosition(5, 0, 7)).toBe('HJ');
      expect(getPosition(6, 0, 7)).toBe('CO');
    });

    it('8-player: BTN, SB, BB, UTG, UTG1, LJ, HJ, CO', () => {
      expect(getPosition(0, 0, 8)).toBe('BTN');
      expect(getPosition(3, 0, 8)).toBe('UTG');
      expect(getPosition(4, 0, 8)).toBe('UTG1');
      expect(getPosition(5, 0, 8)).toBe('LJ');
      expect(getPosition(6, 0, 8)).toBe('HJ');
      expect(getPosition(7, 0, 8)).toBe('CO');
    });
  });

  describe('validation', () => {
    it('throws for fewer than 2 players', () => {
      expect(() => getPosition(0, 0, 1)).toThrow('Invalid number of players');
    });

    it('throws for more than 9 players', () => {
      expect(() => getPosition(0, 0, 10)).toThrow('Invalid number of players');
    });
  });
});

describe('getPositionOrder', () => {
  it('returns 2 positions for heads-up', () => {
    const order = getPositionOrder(2);
    expect(order).toEqual(['SB', 'BB']);
  });

  it('returns 3 positions for 3-player', () => {
    const order = getPositionOrder(3);
    expect(order).toEqual(['BTN', 'SB', 'BB']);
  });

  it('returns 4 positions for 4-player', () => {
    const order = getPositionOrder(4);
    expect(order).toEqual(['BTN', 'SB', 'BB', 'CO']);
  });

  it('returns 5 positions for 5-player', () => {
    const order = getPositionOrder(5);
    expect(order).toEqual(['BTN', 'SB', 'BB', 'UTG', 'CO']);
  });

  it('returns 6 positions for 6-player', () => {
    const order = getPositionOrder(6);
    expect(order).toEqual(['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO']);
  });

  it('returns 7 positions for 7-player', () => {
    const order = getPositionOrder(7);
    expect(order).toEqual(['BTN', 'SB', 'BB', 'UTG', 'LJ', 'HJ', 'CO']);
  });

  it('returns 8 positions for 8-player', () => {
    const order = getPositionOrder(8);
    expect(order).toEqual(['BTN', 'SB', 'BB', 'UTG', 'UTG1', 'LJ', 'HJ', 'CO']);
  });

  it('returns 9 positions for full table', () => {
    const order = getPositionOrder(9);
    expect(order).toEqual(['BTN', 'SB', 'BB', 'UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO']);
  });

  it('returns correct number of positions for each table size', () => {
    for (let n = 2; n <= 9; n++) {
      expect(getPositionOrder(n)).toHaveLength(n);
    }
  });

  it('returns a new array (not a reference to internal data)', () => {
    const a = getPositionOrder(6);
    const b = getPositionOrder(6);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it('throws for invalid player counts', () => {
    expect(() => getPositionOrder(0)).toThrow('Invalid number of players');
    expect(() => getPositionOrder(1)).toThrow('Invalid number of players');
    expect(() => getPositionOrder(10)).toThrow('Invalid number of players');
  });
});

describe('getPositionCategory', () => {
  it('categorizes early positions', () => {
    expect(getPositionCategory('UTG')).toBe('early');
    expect(getPositionCategory('UTG1')).toBe('early');
  });

  it('categorizes middle positions', () => {
    expect(getPositionCategory('MP')).toBe('middle');
    expect(getPositionCategory('LJ')).toBe('middle');
  });

  it('categorizes late positions', () => {
    expect(getPositionCategory('HJ')).toBe('late');
    expect(getPositionCategory('CO')).toBe('late');
    expect(getPositionCategory('BTN')).toBe('late');
  });

  it('categorizes blinds', () => {
    expect(getPositionCategory('SB')).toBe('blinds');
    expect(getPositionCategory('BB')).toBe('blinds');
  });

  it('covers all Position values', () => {
    const allPositions = ['UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;
    const validCategories = ['early', 'middle', 'late', 'blinds'];

    for (const pos of allPositions) {
      const category = getPositionCategory(pos);
      expect(validCategories).toContain(category);
    }
  });
});
