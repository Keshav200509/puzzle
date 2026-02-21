import type { PipeGridLevel, Tile } from './types';

function makeBaseTiles(): Tile[][] {
  return Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, col) => ({
      id: `fixture-${row}-${col}`,
      kind: 'pipe' as const,
      shape: row === 2 ? 'straight-h' : 'straight-v',
      locked: false
    }))
  );
}

export function createEasySolveFixture(): PipeGridLevel {
  const tiles = makeBaseTiles();

  tiles[2][0] = { id: 'start', kind: 'start', locked: true };
  tiles[2][4] = { id: 'end', kind: 'end', locked: true };
  tiles[2][1] = { id: 'easy-empty', kind: 'empty' };
  tiles[1][1] = { id: 'easy-path-a', kind: 'pipe', shape: 'straight-h', locked: false };
  tiles[2][2] = { id: 'easy-path-b', kind: 'pipe', shape: 'straight-h', locked: false };
  tiles[2][3] = { id: 'easy-path-c', kind: 'pipe', shape: 'straight-h', locked: false };

  return {
    size: 5,
    tiles,
    empty: { row: 2, col: 1 },
    start: { row: 2, col: 0 },
    end: { row: 2, col: 4 },
    difficulty: 1
  };
}
