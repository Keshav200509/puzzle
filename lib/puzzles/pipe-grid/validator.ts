import type { Direction, GridPosition, PipeGridLevel, PipeShape, Tile } from './types';

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  right: 'left',
  down: 'up',
  left: 'right'
};

const DELTAS: Record<Direction, { row: number; col: number }> = {
  up: { row: -1, col: 0 },
  right: { row: 0, col: 1 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 }
};

const SHAPE_OPENINGS: Record<PipeShape, Direction[]> = {
  'straight-h': ['left', 'right'],
  'straight-v': ['up', 'down'],
  'corner-ur': ['up', 'right'],
  'corner-rd': ['right', 'down'],
  'corner-dl': ['down', 'left'],
  'corner-lu': ['left', 'up']
};

function getOpenings(tile: Tile): Direction[] {
  if (tile.kind === 'start') return ['right'];
  if (tile.kind === 'end') return ['left'];
  if (tile.kind !== 'pipe' || !tile.shape) return [];
  return SHAPE_OPENINGS[tile.shape];
}

export function findConnectedPath(level: PipeGridLevel): GridPosition[] {
  const visited = new Set<string>();
  const queue: Array<{ pos: GridPosition; parent: string | null }> = [{ pos: level.start, parent: null }];
  const parents = new Map<string, string | null>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const key = `${current.pos.row}:${current.pos.col}`;
    if (visited.has(key)) continue;
    visited.add(key);
    parents.set(key, current.parent);

    const tile = level.tiles[current.pos.row]?.[current.pos.col];
    if (!tile) continue;

    if (current.pos.row === level.end.row && current.pos.col === level.end.col) {
      const path: GridPosition[] = [];
      let cursor: string | null = key;
      while (cursor) {
        const [row, col] = cursor.split(':').map(Number);
        path.unshift({ row, col });
        cursor = parents.get(cursor) ?? null;
      }
      return path;
    }

    for (const direction of getOpenings(tile)) {
      const delta = DELTAS[direction];
      const next = { row: current.pos.row + delta.row, col: current.pos.col + delta.col };
      const nextTile = level.tiles[next.row]?.[next.col];
      if (!nextTile) continue;

      const nextOpenings = getOpenings(nextTile);
      if (!nextOpenings.includes(OPPOSITE[direction])) continue;

      const nextKey = `${next.row}:${next.col}`;
      if (!visited.has(nextKey)) {
        queue.push({ pos: next, parent: key });
      }
    }
  }

  return [];
}

export function hasConnectedPath(level: PipeGridLevel): boolean {
  return findConnectedPath(level).length > 0;
}
