import type { DrillPack } from '../../types/drillPack';
import { DRILL_SPOTS } from '../drillSpots';

export const CORE_PACK: DrillPack = {
  id: 'core',
  name: 'Core Spots',
  description: '37 essential GTO training spots covering preflop through river',
  version: 1,
  spots: DRILL_SPOTS,
};
