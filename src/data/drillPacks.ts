import type { DrillPack } from '../types/drillPack';
import type { DrillSpot } from '../types/drill';
import { CORE_PACK } from './packs/core';
import { MULTIWAY_PACK } from './packs/multiway';

export const DRILL_PACKS: DrillPack[] = [CORE_PACK, MULTIWAY_PACK];

export function getAllSpots(): DrillSpot[] {
  return DRILL_PACKS.flatMap((pack) => pack.spots);
}

export function getPackById(id: string): DrillPack | undefined {
  return DRILL_PACKS.find((pack) => pack.id === id);
}
