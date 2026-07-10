import type { IWaterConverter } from '../shared/types';
import { WATER_ML_PER_TOKEN } from '../shared/constants';

export class WaterConverter implements IWaterConverter {
  constructor(private ratio: number = WATER_ML_PER_TOKEN) {}

  toMl(tokens: number): number {
    return tokens * this.ratio;
  }
}
