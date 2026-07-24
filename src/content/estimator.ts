import type { ITokenEstimator } from '../shared/types';

export class BPEstimator implements ITokenEstimator {
  private lastTokenCount = 0;
  private multiplier = 1.5;

  setMultiplier(m: number): void {
    this.multiplier = m;
  }

  setLastCount(count: number): void {
    this.lastTokenCount = count;
  }

  estimate(fullText: string): number {
    if (fullText.length === 0) return 0;
    const charTokens = Math.round(fullText.length / 4);
    const total = Math.round(charTokens * this.multiplier);
    const delta = Math.max(0, total - this.lastTokenCount);
    this.lastTokenCount = total;
    return delta;
  }

  reset(): void {
    this.lastTokenCount = 0;
  }
}
