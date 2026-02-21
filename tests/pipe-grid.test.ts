import { describe, expect, it } from 'vitest';
import { createSeedHash } from '@/lib/core/seed';
import { generatePipeGrid, levelConfig } from '@/lib/puzzles/pipe-grid/generator';
import { hasConnectedPath } from '@/lib/puzzles/pipe-grid/validator';

describe('pipe grid generator', () => {
  it('is deterministic for same day seed', async () => {
    const seedA = await createSeedHash('2026-06-01', 'logic-looper-v1');
    const seedB = await createSeedHash('2026-06-01', 'logic-looper-v1');

    const levelA = generatePipeGrid(seedA);
    const levelB = generatePipeGrid(seedB);

    expect(levelA).toEqual(levelB);
  });

  it('scales level difficulty deterministically', async () => {
    const cfg = levelConfig(8);
    const seed = await createSeedHash('level-8', 'logic-looper-v1');
    const one = generatePipeGrid(seed, cfg);
    const two = generatePipeGrid(seed, cfg);
    expect(one).toEqual(two);
    expect(cfg.scrambleMoves).toBeGreaterThan(levelConfig(1).scrambleMoves);
  });
});

describe('pipe grid validator', () => {
  it('detects solvable and unsolvable boards', () => {
    const solvedLevel = {
      size: 5,
      start: { row: 2, col: 0 },
      end: { row: 2, col: 4 },
      difficulty: 1,
      empty: { row: 4, col: 4 },
      tiles: Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: 5 }, (_, col) => {
          if (row === 2 && col === 0) return { id: 'start', kind: 'start' as const, locked: true };
          if (row === 2 && col === 4) return { id: 'end', kind: 'end' as const, locked: true };
          if (row === 2 && col > 0 && col < 4) {
            return { id: `p-${col}`, kind: 'pipe' as const, shape: 'straight-h' as const, locked: false };
          }
          if (row === 4 && col === 4) return { id: 'e', kind: 'empty' as const };
          return { id: `x-${row}-${col}`, kind: 'pipe' as const, shape: 'corner-rd' as const, locked: false };
        })
      )
    };

    expect(hasConnectedPath(solvedLevel)).toBe(true);

    const broken = structuredClone(solvedLevel);
    broken.tiles[2][2] = { id: 'broken', kind: 'pipe', shape: 'straight-v', locked: false };

    expect(hasConnectedPath(broken)).toBe(false);
  });
});
