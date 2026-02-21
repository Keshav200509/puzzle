import { describe, expect, it } from 'vitest';
import { calculateStreak } from '@/lib/core/streak';

describe('calculateStreak', () => {
  it('walks backward from today until unsolved', () => {
    const activity = {
      '2026-01-10': { solved: true },
      '2026-01-09': { solved: true },
      '2026-01-08': { solved: false }
    };

    const streak = calculateStreak(activity, new Date('2026-01-10T09:00:00'));
    expect(streak).toBe(2);
  });
});
