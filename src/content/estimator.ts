import type { ITokenEstimator } from '../shared/types';
import { encode } from 'gpt-tokenizer';

const TOKENIZER_MULTIPLIER = 2.5;

export class BPEstimator implements ITokenEstimator {
  private lastTokenCount = 0;

  estimate(fullText: string): number {
    if (fullText.length === 0) return 0;
    const gptTokens = encode(fullText).length;
    const total = Math.round(gptTokens * TOKENIZER_MULTIPLIER);
    const delta = Math.max(0, total - this.lastTokenCount);
    this.lastTokenCount = total;
    return delta;
  }

  reset(): void {
    this.lastTokenCount = 0;
  }
}
