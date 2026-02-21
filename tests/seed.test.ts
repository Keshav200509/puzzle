import { describe, expect, it } from 'vitest';
import { createSeedHash } from '@/lib/core/seed';

describe('seed determinism', () => {
  it('returns identical hash for same input', async () => {
    const a = await createSeedHash('2026-01-10', 'secret');
    const b = await createSeedHash('2026-01-10', 'secret');
    expect(a).toBe(b);
  });

  it('returns different hash for different date', async () => {
    const a = await createSeedHash('2026-01-10', 'secret');
    const b = await createSeedHash('2026-01-11', 'secret');
    expect(a).not.toBe(b);
  });
});
