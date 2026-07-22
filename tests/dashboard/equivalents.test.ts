import { describe, it, expect } from 'vitest';
import { EquivalentGenerator } from '../../src/dashboard/equivalents';

describe('EquivalentGenerator', () => {
  const gen = new EquivalentGenerator();

  it('generates equivalents for moderate water volume', () => {
    const result = gen.generate(10000);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(6);
    for (const eq of result) {
      expect(eq.value).toBeGreaterThanOrEqual(0.01);
      expect(eq.value).toBeLessThanOrEqual(999999);
      expect(eq.spriteKey).toBeTruthy();
      expect(eq.unit).toBeTruthy();
    }
  });

  it('returns empty for zero water', () => {
    const result = gen.generate(0);
    expect(result).toHaveLength(0);
  });

  it('returns empty for tiny water volume', () => {
    const result = gen.generate(0.001);
    expect(result).toHaveLength(0);
  });

  it('returns all equivalents sorted by value descending', () => {
    const result = gen.generate(10000 * 1000);
    expect(result.length).toBeGreaterThan(0);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].value).toBeLessThanOrEqual(result[i - 1].value);
    }
  });

  it('includes water bottles numerator at 1000ml', () => {
    const result = gen.generate(1000);
    const bottles = result.find(e => e.spriteKey === 'bottle');
    expect(bottles).toBeTruthy();
    expect(bottles!.value).toBeCloseTo(2, 1);
  });

  it('includes tea cups numerator at 500ml', () => {
    const result = gen.generate(500);
    const cups = result.find(e => e.spriteKey === 'tea-cup');
    expect(cups).toBeTruthy();
    expect(cups!.value).toBeCloseTo(2, 1);
  });

  it('includes showers numerator at 1e9 ml', () => {
    const result = gen.generate(1_000_000_000);
    const showers = result.find(e => e.spriteKey === 'shower');
    expect(showers).toBeTruthy();
    expect(showers!.value).toBeCloseTo(16666.67, 0);
  });

  it('caps at 6 equivalents even when many qualify', () => {
    const result = gen.generate(10_000_000_000);
    expect(result.length).toBeLessThanOrEqual(6);
  });
});
