import type { DrillSpot } from './drill';

export interface DrillPack {
  id: string;
  name: string;
  description: string;
  version: number;
  spots: DrillSpot[];
}
