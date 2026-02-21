import { describe, expect, it } from 'vitest';
import { resolveElapsedSeconds } from '@/lib/core/timer';

describe('resolveElapsedSeconds', () => {
  it('restores using the larger of measured or persisted elapsed', () => {
    const startedAt = 1000;
    const now = 15_000;
    expect(resolveElapsedSeconds(startedAt, now, 20)).toBe(20);
    expect(resolveElapsedSeconds(startedAt, now, 0)).toBe(14);
  });
});
