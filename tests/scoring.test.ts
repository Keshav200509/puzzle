import { describe, expect, it } from 'vitest';
import { computeDailyScore, computeStars, SCORE_BASE, SCORE_PER_HINT, SCORE_PER_MOVE } from '@/lib/core/scoring';

describe('computeDailyScore', () => {
  it('uses moves and hints only', () => {
    expect(computeDailyScore(10, 2)).toBe(SCORE_BASE - 10 * SCORE_PER_MOVE - 2 * SCORE_PER_HINT);
  });

  it('clamps at zero', () => {
    expect(computeDailyScore(1000, 100)).toBe(0);
  });
});

describe('computeStars', () => {
  it('returns three tiers', () => {
    expect(computeStars(10, 2)).toBe(3);
    expect(computeStars(24, 2)).toBe(3);
    expect(computeStars(30, 2)).toBe(2);
    expect(computeStars(80, 2)).toBe(1);
  });
});
