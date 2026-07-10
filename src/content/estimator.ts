import type { ITokenEstimator } from '../shared/types';

const VOCAB: Map<string, number> = new Map();
const COMMON_PAIRS = [
  'th', 'he', 'in', 'er', 'an', 'on', 'at', 'en', 'nd', 'ti',
  'es', 'or', 'te', 'of', 'ed', 'is', 'it', 'al', 'ar', 'st',
  'to', 'nt', 'ng', 'se', 'ha', 'as', 'ou', 'io', 'le', 've',
  'co', 'me', 'de', 'hi', 'ri', 'ro', 'ic', 'ne', 'ea', 'ra',
  'ce', 'li', 'ch', 'll', 'be', 'ma', 'si', 'om', 'ur', 'ca',
  'el', 'ta', 'la', 'ns', 'di', 'fo', 're', 'wh', 'wi', 'bu',
];
for (let i = 0; i < COMMON_PAIRS.length; i++) {
  VOCAB.set(COMMON_PAIRS[i], i);
}

const BYTE_TO_STR: Record<number, string> = {};
for (let i = 0; i < 256; i++) {
  BYTE_TO_STR[i] = String.fromCodePoint(i);
}

export class BPEstimator implements ITokenEstimator {
  estimate(text: string): number {
    if (text.length === 0) return 0;

    const tokens: string[] = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code < 256) {
        tokens.push(BYTE_TO_STR[code]);
      } else {
        tokens.push(text[i]);
      }
    }

    while (true) {
      let bestPair: [number, number] | null = null;
      let bestRank = Infinity;

      for (let i = 0; i < tokens.length - 1; i++) {
        const pairKey = tokens[i] + tokens[i + 1];
        const rank = VOCAB.get(pairKey);
        if (rank !== undefined && rank < bestRank) {
          bestRank = rank;
          bestPair = [i, i + 1];
        }
      }

      if (bestPair === null) break;

      const merged = tokens[bestPair[0]] + tokens[bestPair[1]];
      tokens.splice(bestPair[0], 2, merged);
    }

    return tokens.length;
  }
}
