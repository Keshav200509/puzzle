import type { GridPosition, PipeGridLevel, PipeGridProgressState, Tile } from './types';

export function cloneTiles(tiles: Tile[][]): Tile[][] {
  return tiles.map((row) => row.map((tile) => ({ ...tile })));
}

export function toProgressState(level: PipeGridLevel, moves: number): PipeGridProgressState {
  return {
    tiles: cloneTiles(level.tiles),
    empty: { ...level.empty },
    moves
  };
}

export function applyProgress(level: PipeGridLevel, progress?: PipeGridProgressState): PipeGridLevel {
  if (!progress) return level;
  return {
    ...level,
    tiles: cloneTiles(progress.tiles),
    empty: { ...progress.empty }
  };
}

export function canSlide(level: PipeGridLevel, from: GridPosition): boolean {
  const tile = level.tiles[from.row]?.[from.col];
  if (!tile || tile.kind === 'empty' || tile.locked) return false;
  return Math.abs(from.row - level.empty.row) + Math.abs(from.col - level.empty.col) === 1;
}

export function slideTile(level: PipeGridLevel, from: GridPosition): PipeGridLevel {
  if (!canSlide(level, from)) return level;

  const tiles = cloneTiles(level.tiles);
  const moving = tiles[from.row][from.col];
  const empty = level.empty;

  tiles[empty.row][empty.col] = { ...moving };
  tiles[from.row][from.col] = { id: `empty-${from.row}-${from.col}`, kind: 'empty' };

  return {
    ...level,
    tiles,
    empty: { ...from }
  };
}
