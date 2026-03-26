import { describe, it, expect } from 'vitest';
import { DRILL_PACKS, getAllSpots, getPackById } from '../drillPacks';
import { DRILL_SPOTS } from '../drillSpots';

describe('drillPacks registry', () => {
  it('has at least the core pack', () => {
    expect(DRILL_PACKS.length).toBeGreaterThanOrEqual(1);
    const core = DRILL_PACKS.find((p) => p.id === 'core');
    expect(core).toBeDefined();
    expect(core!.name).toBe('Core Spots');
  });

  it('core pack contains all 37 original spots', () => {
    const core = DRILL_PACKS.find((p) => p.id === 'core')!;
    expect(core.spots.length).toBe(37);
  });

  it('getAllSpots returns all spots from all packs', () => {
    const all = getAllSpots();
    expect(all.length).toBeGreaterThanOrEqual(37);
  });

  it('getAllSpots includes core spots with unchanged IDs', () => {
    const all = getAllSpots();
    const coreIds = DRILL_SPOTS.map((s) => s.id);
    for (const id of coreIds) {
      expect(all.some((s) => s.id === id)).toBe(true);
    }
  });

  it('getPackById returns correct pack', () => {
    const core = getPackById('core');
    expect(core).toBeDefined();
    expect(core!.id).toBe('core');
  });

  it('getPackById returns undefined for unknown id', () => {
    expect(getPackById('nonexistent')).toBeUndefined();
  });

  it('all spot IDs are unique across packs', () => {
    const all = getAllSpots();
    const ids = all.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('multiway pack', () => {
  it('exists in the registry', () => {
    const multiway = DRILL_PACKS.find((p) => p.id === 'multiway');
    expect(multiway).toBeDefined();
  });

  it('has 12 spots', () => {
    const multiway = DRILL_PACKS.find((p) => p.id === 'multiway')!;
    expect(multiway.spots.length).toBe(12);
  });

  it('all spot IDs are prefixed with multiway_', () => {
    const multiway = DRILL_PACKS.find((p) => p.id === 'multiway')!;
    for (const spot of multiway.spots) {
      expect(spot.id).toMatch(/^multiway_/);
    }
  });

  it('no ID collisions with core spots', () => {
    const core = DRILL_PACKS.find((p) => p.id === 'core')!;
    const multiway = DRILL_PACKS.find((p) => p.id === 'multiway')!;
    const coreIds = new Set(core.spots.map((s) => s.id));
    for (const spot of multiway.spots) {
      expect(coreIds.has(spot.id)).toBe(false);
    }
  });

  it('each spot has valid decisionContext', () => {
    const multiway = DRILL_PACKS.find((p) => p.id === 'multiway')!;
    for (const spot of multiway.spots) {
      expect(spot.decisionContext).toBeDefined();
      expect(spot.decisionContext.holeCards.length).toBe(2);
      expect(spot.decisionContext.pot).toBeGreaterThan(0);
    }
  });

  it('all spots have numActivePlayers >= 3', () => {
    const multiway = DRILL_PACKS.find((p) => p.id === 'multiway')!;
    for (const spot of multiway.spots) {
      expect(spot.decisionContext.numActivePlayers).toBeGreaterThanOrEqual(3);
    }
  });

  it('all spots have numPlayersInHand >= 3', () => {
    const multiway = DRILL_PACKS.find((p) => p.id === 'multiway')!;
    for (const spot of multiway.spots) {
      expect(spot.decisionContext.numPlayersInHand).toBeGreaterThanOrEqual(3);
    }
  });

  it('has spots covering all four categories', () => {
    const multiway = DRILL_PACKS.find((p) => p.id === 'multiway')!;
    const categories = new Set(multiway.spots.map((s) => s.category));
    expect(categories).toContain('preflop');
    expect(categories).toContain('flop');
    expect(categories).toContain('turn');
    expect(categories).toContain('river');
  });

  it('community card count matches category for each spot', () => {
    const multiway = DRILL_PACKS.find((p) => p.id === 'multiway')!;
    for (const spot of multiway.spots) {
      const expected = { preflop: 0, flop: 3, turn: 4, river: 5 }[spot.category];
      expect(spot.communityCards.length).toBe(expected);
    }
  });

  it('heroCards match decisionContext.holeCards', () => {
    const multiway = DRILL_PACKS.find((p) => p.id === 'multiway')!;
    for (const spot of multiway.spots) {
      expect(spot.heroCards).toEqual(spot.decisionContext.holeCards);
    }
  });
});
