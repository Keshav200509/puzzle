import { describe, expect, it } from 'vitest';
import { hasDayRolledOver } from '@/lib/core/date';

describe('hasDayRolledOver', () => {
  it('returns true when date key changes at midnight', () => {
    expect(hasDayRolledOver('2026-05-01', new Date('2026-05-02T00:00:01'))).toBe(true);
  });

  it('returns false for same local day', () => {
    expect(hasDayRolledOver('2026-05-01', new Date('2026-05-01T23:59:59'))).toBe(false);
  });
});
