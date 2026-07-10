import { describe, it, expect } from 'vitest';
import { WaterConverter } from '../../src/content/converter';
import type { IWaterConverter } from '../../src/shared/types';

describe('WaterConverter', () => {
  let converter: IWaterConverter;

  it('converts 1000 tokens to 3 ml', () => {
    converter = new WaterConverter();
    expect(converter.toMl(1000)).toBe(3);
  });

  it('converts 0 tokens to 0 ml', () => {
    converter = new WaterConverter();
    expect(converter.toMl(0)).toBe(0);
  });

  it('handles fractional results', () => {
    converter = new WaterConverter();
    const result = converter.toMl(1);
    expect(result).toBeCloseTo(0.003, 5);
  });

  it('accepts a custom ratio in constructor', () => {
    converter = new WaterConverter(0.005);
    expect(converter.toMl(1000)).toBe(5);
  });
});
