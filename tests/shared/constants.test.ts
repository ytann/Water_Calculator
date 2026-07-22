import { describe, it, expect } from 'vitest';
import {
  WATER_ML_PER_TOKEN,
  DEFAULT_PLATFORMS,
} from '../../src/shared/constants';

describe('constants', () => {
  it('WATER_ML_PER_TOKEN is 0.003', () => {
    expect(WATER_ML_PER_TOKEN).toBe(0.003);
  });

  it('DEFAULT_PLATFORMS includes 4 platforms', () => {
    expect(DEFAULT_PLATFORMS).toHaveLength(4);
  });

  it('each platform has required selector fields', () => {
    for (const p of DEFAULT_PLATFORMS) {
      expect(typeof p.id).toBe('string');
      expect(p.selectors.messages.length).toBeGreaterThan(0);
      expect(p.selectors.pageTitle.length).toBeGreaterThan(0);
      expect(p.selectors.titleSelector.length).toBeGreaterThan(0);
      expect(p.selectors.input.length).toBeGreaterThan(0);
      expect(p.builtIn).toBe(true);
    }
  });
});
