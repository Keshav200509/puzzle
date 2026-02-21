import { describe, expect, it } from 'vitest';
import { buildHeatmapGrid, getIntensity } from '@/lib/core/heatmap';

describe('buildHeatmapGrid', () => {
  it('builds full year map and preserves 7 rows per column', () => {
    const grid = buildHeatmapGrid(2024, {
      '2024-01-01': { solved: true, difficulty: 1, score: 500, moves: 35 }
    });

    expect(grid.length).toBeGreaterThan(52);
    expect(grid.every((week) => week.length === 7)).toBe(true);
  });

  it('prefers move/score-based intensity', () => {
    expect(getIntensity({ solved: true, difficulty: 2, score: 1100, moves: 14, hintsUsed: 0 })).toBe(4);
    expect(getIntensity({ solved: true, difficulty: 1, score: 700, moves: 40, hintsUsed: 2 })).toBe(1);
  });
});
