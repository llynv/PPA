import { describe, it, expect } from 'vitest';
import { DRILL_SPOTS } from '../drillSpots';
import { evaluateDecision } from '../../lib/poker-engine/decision';

describe('drillSpots library', () => {
  it('has at least 30 spots', () => {
    expect(DRILL_SPOTS.length).toBeGreaterThanOrEqual(30);
  });

  it('every spot has a unique id', () => {
    const ids = DRILL_SPOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every spot has required fields', () => {
    for (const spot of DRILL_SPOTS) {
      expect(spot.id).toBeTruthy();
      expect(spot.name).toBeTruthy();
      expect(['preflop', 'flop', 'turn', 'river']).toContain(spot.category);
      expect([1, 2, 3]).toContain(spot.difficulty);
      expect(spot.heroCards).toHaveLength(2);
      expect(spot.decisionContext).toBeDefined();
      expect(spot.decisionContext.holeCards).toHaveLength(2);
      expect(spot.potSize).toBeGreaterThan(0);
    }
  });

  it('has spots in every category', () => {
    const categories = new Set(DRILL_SPOTS.map((s) => s.category));
    expect(categories).toContain('preflop');
    expect(categories).toContain('flop');
    expect(categories).toContain('turn');
    expect(categories).toContain('river');
  });

  it('heroCards match decisionContext.holeCards', () => {
    for (const spot of DRILL_SPOTS) {
      expect(spot.heroCards).toEqual(spot.decisionContext.holeCards);
    }
  });

  it('communityCards match decisionContext.communityCards', () => {
    for (const spot of DRILL_SPOTS) {
      expect(spot.communityCards).toEqual(spot.decisionContext.communityCards);
    }
  });

  it('community card count matches category', () => {
    for (const spot of DRILL_SPOTS) {
      const expected = { preflop: 0, flop: 3, turn: 4, river: 5 }[spot.category];
      expect(spot.communityCards.length).toBe(expected);
    }
  });

  it('every spot produces a valid DecisionResult from evaluateDecision', () => {
    for (const spot of DRILL_SPOTS) {
      const result = evaluateDecision(spot.decisionContext);
      expect(result.optimalAction).toBeTruthy();
      expect(result.frequencies).toBeDefined();
      const total = result.frequencies.fold + result.frequencies.call + result.frequencies.raise;
      expect(total).toBeGreaterThan(0.95);
      expect(total).toBeLessThanOrEqual(1.01);
    }
  });
});
