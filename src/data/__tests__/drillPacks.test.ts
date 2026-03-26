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
