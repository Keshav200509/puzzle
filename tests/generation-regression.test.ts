import { describe, expect, it } from 'vitest';
import { createSeedHash } from '@/lib/core/seed';
import { computeStars } from '@/lib/core/scoring';
import { slideTile } from '@/lib/puzzles/pipe-grid/gameplay';
import { generatePipeGridWithTrace, levelConfig } from '@/lib/puzzles/pipe-grid/generator';
import { hasConnectedPath } from '@/lib/puzzles/pipe-grid/validator';

describe('generation regression', () => {
  it('produces solvable boards across sampled seeds', async () => {
    const samples = 40;

    for (let i = 0; i < samples; i += 1) {
      const seed = await createSeedHash(`sample-${i}`, 'logic-looper-v1');
      const { level, trace } = generatePipeGridWithTrace(seed);

      let current = structuredClone(level);
      for (let j = trace.length - 1; j >= 0; j -= 1) {
        current = slideTile(current, trace[j].emptyBefore);
      }

      expect(hasConnectedPath(current)).toBe(true);
    }
  });

  it('keeps star-band thresholds reasonable over level configs', () => {
    for (let level = 1; level <= 20; level += 1) {
      const cfg = levelConfig(level);
      const targetMoves = 16 + cfg.difficulty * 4;

      expect(computeStars(targetMoves, cfg.difficulty)).toBe(3);
      expect(computeStars(targetMoves + 4, cfg.difficulty)).toBeGreaterThanOrEqual(2);
      expect(computeStars(targetMoves + 20, cfg.difficulty)).toBe(1);
    }
  });
});
