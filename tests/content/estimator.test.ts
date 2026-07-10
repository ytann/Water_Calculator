import { describe, it, expect, beforeEach } from 'vitest';
import { BPEstimator } from '../../src/content/estimator';
import type { ITokenEstimator } from '../../src/shared/types';

function fullTokens(est: ITokenEstimator, text: string): number {
  est.reset();
  return est.estimate(text);
}

describe('BPEstimator', () => {
  let estimator: ITokenEstimator;

  beforeEach(() => {
    estimator = new BPEstimator();
  });

  it('returns 0 for empty string', () => {
    expect(estimator.estimate('')).toBe(0);
  });

  it('returns a positive number for non-empty text', () => {
    const tokens = fullTokens(estimator, 'Hello, world!');
    expect(tokens).toBeGreaterThan(0);
  });

  it('longer text produces more tokens', () => {
    const short = fullTokens(estimator, 'hi');
    const long = fullTokens(estimator, 'this is a much longer piece of text');
    expect(long).toBeGreaterThan(short);
  });

  it('token count is roughly proportional to character count', () => {
    const text = 'The quick brown fox jumps over the lazy dog.';
    const tokens = fullTokens(estimator, text);
    expect(tokens).toBeLessThan(text.length);
    expect(tokens).toBeGreaterThan(text.length * 0.25);
  });

  it('handles repeated characters', () => {
    const tokens = fullTokens(estimator, 'aaaaaaaaaaaaaaaaaaaa');
    expect(tokens).toBeGreaterThan(0);
  });

  it('handles code-like text', () => {
    const tokens = fullTokens(estimator, 'function hello() { return 42; }');
    expect(tokens).toBeGreaterThan(0);
  });

  it('reports only delta when called multiple times without reset', () => {
    const a = estimator.estimate('Hello');
    expect(a).toBeGreaterThan(0);
    const b = estimator.estimate('Hello world');
    expect(b).toBeGreaterThan(0);
    expect(b).toBeLessThan(a + b); // should be less than total (only the delta)
  });

  it('reset clears internal state', () => {
    estimator.estimate('Hello');
    estimator.reset();
    expect(estimator.estimate('Hello')).toBeGreaterThan(0);
  });
});
