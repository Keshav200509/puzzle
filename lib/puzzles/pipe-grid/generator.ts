import { createSeededRandom } from '@/lib/core/seed';
import type { GridPosition, PipeGridLevel, PipeShape, Tile } from './types';

const SIZE = 5;
const START: GridPosition = { row: 2, col: 0 };
const END: GridPosition = { row: 2, col: 4 };

const RANDOM_SHAPES: PipeShape[] = ['corner-dl', 'corner-lu', 'corner-rd', 'corner-ur', 'straight-h', 'straight-v'];

type GeneratorOptions = {
  scrambleMoves?: number;
  lockedCount?: number;
  difficulty?: number;
};

export type ScrambleTraceStep = {
  emptyBefore: GridPosition;
};

function cloneTiles(tiles: Tile[][]): Tile[][] {
  return tiles.map((row) => row.map((tile) => ({ ...tile })));
}

function baseSolvedTiles(random: () => number): Tile[][] {
  const tiles: Tile[][] = Array.from({ length: SIZE }, (_, row) =>
    Array.from({ length: SIZE }, (_, col) => ({
      id: `tile-${row}-${col}`,
      kind: 'pipe' as const,
      shape: RANDOM_SHAPES[Math.floor(random() * RANDOM_SHAPES.length)],
      locked: false
    }))
  );

  tiles[START.row][START.col] = { id: 'start', kind: 'start', locked: true };
  tiles[END.row][END.col] = { id: 'end', kind: 'end', locked: true };

  tiles[2][1] = { id: 'path-a', kind: 'pipe', shape: 'straight-h', locked: false };
  tiles[2][2] = { id: 'path-b', kind: 'pipe', shape: 'straight-h', locked: false };
  tiles[2][3] = { id: 'path-c', kind: 'pipe', shape: 'straight-h', locked: false };

  return tiles;
}

function neighbors(position: GridPosition): GridPosition[] {
  return [
    { row: position.row - 1, col: position.col },
    { row: position.row + 1, col: position.col },
    { row: position.row, col: position.col - 1 },
    { row: position.row, col: position.col + 1 }
  ].filter((item) => item.row >= 0 && item.row < SIZE && item.col >= 0 && item.col < SIZE);
}

function slide(tiles: Tile[][], empty: GridPosition, from: GridPosition): GridPosition {
  const moving = tiles[from.row][from.col];
  if (moving.locked) return empty;

  tiles[empty.row][empty.col] = { ...moving };
  tiles[from.row][from.col] = { id: `empty-${from.row}-${from.col}`, kind: 'empty' };
  return { ...from };
}

function addLockedTiles(tiles: Tile[][], random: () => number, lockedCount: number) {
  const candidates = [] as Array<{ row: number; col: number }>;
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const tile = tiles[row][col];
      if (tile.kind === 'pipe' && !tile.id.startsWith('path-')) {
        candidates.push({ row, col });
      }
    }
  }

  for (let i = 0; i < lockedCount && candidates.length > 0; i += 1) {
    const pick = Math.floor(random() * candidates.length);
    const cell = candidates.splice(pick, 1)[0];
    tiles[cell.row][cell.col].locked = true;
  }
}

export function generatePipeGridWithTrace(seedHex: string, options: GeneratorOptions = {}): { level: PipeGridLevel; trace: ScrambleTraceStep[] } {
  const random = createSeededRandom(seedHex);
  const scrambleMoves = options.scrambleMoves ?? 40;
  const lockedCount = options.lockedCount ?? 2;
  const difficulty = options.difficulty ?? 2;

  const tiles = baseSolvedTiles(random);
  addLockedTiles(tiles, random, lockedCount);

  let empty: GridPosition = { row: 4, col: 4 };
  tiles[empty.row][empty.col] = { id: 'empty', kind: 'empty' };
  const trace: ScrambleTraceStep[] = [];

  for (let i = 0; i < scrambleMoves; i += 1) {
    const candidates = neighbors(empty).filter((item) => !tiles[item.row][item.col].locked);
    if (candidates.length === 0) continue;
    const pick = candidates[Math.floor(random() * candidates.length)];
    trace.push({ emptyBefore: { ...empty } });
    empty = slide(tiles, empty, pick);
  }

  return {
    level: {
      size: SIZE,
      tiles: cloneTiles(tiles),
      empty,
      start: START,
      end: END,
      difficulty
    },
    trace
  };
}

export function generatePipeGrid(seedHex: string, options: GeneratorOptions = {}): PipeGridLevel {
  return generatePipeGridWithTrace(seedHex, options).level;
}

export function levelConfig(levelNumber: number): Required<GeneratorOptions> {
  const safeLevel = Math.max(1, Math.floor(levelNumber));
  return {
    scrambleMoves: 18 + safeLevel * 6,
    lockedCount: Math.min(10, 1 + Math.floor(safeLevel / 2)),
    difficulty: Math.min(5, 1 + Math.floor(safeLevel / 3))
  };
}
