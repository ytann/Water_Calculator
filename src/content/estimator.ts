import type { ITokenEstimator } from '../shared/types';
import { encode } from 'gpt-tokenizer';

export class BPEstimator implements ITokenEstimator {
  private lastTokenCount = 0;
  private multiplier = 1.5;

  setMultiplier(m: number): void {
    this.multiplier = m;
  }

  estimate(fullText: string): number {
    if (fullText.length === 0) return 0;
    const gptTokens = encode(fullText).length;
    const total = Math.round(gptTokens * this.multiplier);
    const delta = Math.max(0, total - this.lastTokenCount);
    this.lastTokenCount = total;
    return delta;
  }

  reset(): void {
    this.lastTokenCount = 0;
  }
}
