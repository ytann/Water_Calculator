import { describe, it, expect, beforeEach } from 'vitest';
import { BPEstimator } from '../../src/content/estimator';
import type { ITokenEstimator } from '../../src/shared/types';

describe('BPEstimator', () => {
  let estimator: ITokenEstimator;

  beforeEach(() => {
    estimator = new BPEstimator();
  });

  it('returns 0 for empty string', () => {
    expect(estimator.estimate('')).toBe(0);
  });

  it('returns a positive number for non-empty text', () => {
    const tokens = estimator.estimate('Hello, world!');
    expect(tokens).toBeGreaterThan(0);
  });

  it('longer text produces more tokens', () => {
    const short = estimator.estimate('hi');
    const long = estimator.estimate('this is a much longer piece of text');
    expect(long).toBeGreaterThan(short);
  });

  it('token count is roughly proportional to character count', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const tokens = estimator.estimate(text);
    expect(tokens).toBeLessThan(text.length);
    expect(tokens).toBeGreaterThan(text.length * 0.25);
  });

  it('handles repeated characters', () => {
    const tokens = estimator.estimate('aaaaaaaaaaaaaaaaaaaa');
    expect(tokens).toBeGreaterThan(0);
  });

  it('handles code-like text', () => {
    const tokens = estimator.estimate('function hello() { return 42; }');
    expect(tokens).toBeGreaterThan(0);
  });
});
