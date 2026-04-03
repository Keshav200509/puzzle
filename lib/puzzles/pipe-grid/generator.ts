import { createSeededRandom } from '@/lib/core/seed';
import type { Direction, GridPosition, PipeGridLevel, PipeShape, Tile } from './types';

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

function neighbors(position: GridPosition): GridPosition[] {
  return [
    { row: position.row - 1, col: position.col },
    { row: position.row + 1, col: position.col },
    { row: position.row, col: position.col - 1 },
    { row: position.row, col: position.col + 1 }
  ].filter((item) => item.row >= 0 && item.row < SIZE && item.col >= 0 && item.col < SIZE);
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function keyOf(position: GridPosition): string {
  return `${position.row}:${position.col}`;
}

function directionBetween(a: GridPosition, b: GridPosition): Direction {
  if (b.row < a.row) return 'up';
  if (b.row > a.row) return 'down';
  if (b.col < a.col) return 'left';
  return 'right';
}

function shapeForDirections(a: Direction, b: Direction): PipeShape {
  const pair = new Set([a, b]);
  if (pair.has('left') && pair.has('right')) return 'straight-h';
  if (pair.has('up') && pair.has('down')) return 'straight-v';
  if (pair.has('up') && pair.has('right')) return 'corner-ur';
  if (pair.has('right') && pair.has('down')) return 'corner-rd';
  if (pair.has('down') && pair.has('left')) return 'corner-dl';
  return 'corner-lu';
}

function findPath(random: () => number, minLength: number): GridPosition[] {
  const startNeighbor: GridPosition = { row: START.row, col: START.col + 1 };
  const endNeighbor: GridPosition = { row: END.row, col: END.col - 1 };

  let bestMiddle: GridPosition[] = [startNeighbor, { row: START.row, col: START.col + 2 }, endNeighbor];

  const search = (current: GridPosition, visited: Set<string>, stack: GridPosition[]) => {
    if (current.row === endNeighbor.row && current.col === endNeighbor.col) {
      if (stack.length > bestMiddle.length) bestMiddle = [...stack];
      if (stack.length + 2 >= minLength) return true;
      return false;
    }

    const options = shuffle(neighbors(current), random).filter((candidate) => {
      const key = keyOf(candidate);
      if (visited.has(key)) return false;
      if (candidate.row === START.row && candidate.col === START.col) return false;
      if (candidate.row === END.row && candidate.col === END.col) return false;
      return true;
    });

    for (const next of options) {
      visited.add(keyOf(next));
      stack.push(next);
      const found = search(next, visited, stack);
      if (found) return true;
      stack.pop();
      visited.delete(keyOf(next));
    }

    return false;
  };

  search(startNeighbor, new Set([keyOf(START), keyOf(startNeighbor), keyOf(END)]), [startNeighbor]);

  return [START, ...bestMiddle, END];
}

function baseSolvedTiles(random: () => number, minPathLength: number): Tile[][] {
  const tiles: Tile[][] = Array.from({ length: SIZE }, (_, row) =>
    Array.from({ length: SIZE }, (_, col) => ({
      id: `tile-${row}-${col}`,
      kind: 'pipe' as const,
      shape: RANDOM_SHAPES[Math.floor(random() * RANDOM_SHAPES.length)],
      locked: false
    }))
  );

  const path = findPath(random, minPathLength);

  tiles[START.row][START.col] = { id: 'start', kind: 'start', locked: true };
  tiles[END.row][END.col] = { id: 'end', kind: 'end', locked: true };

  for (let i = 1; i < path.length - 1; i += 1) {
    const previous = path[i - 1];
    const current = path[i];
    const next = path[i + 1];
    const entry = directionBetween(current, previous);
    const exit = directionBetween(current, next);

    tiles[current.row][current.col] = {
      id: `path-${i}`,
      kind: 'pipe',
      shape: shapeForDirections(entry, exit),
      locked: false
    };
  }

  return tiles;
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


function pickInitialEmpty(tiles: Tile[][], random: () => number): GridPosition {
  const candidates: GridPosition[] = [];
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const tile = tiles[row][col];
      if (tile.kind === 'pipe' && !tile.id.startsWith('path-') && !tile.locked) {
        candidates.push({ row, col });
      }
    }
  }

  if (candidates.length === 0) return { row: SIZE - 1, col: SIZE - 1 };
  return candidates[Math.floor(random() * candidates.length)];
}

export function generatePipeGridWithTrace(seedHex: string, options: GeneratorOptions = {}): { level: PipeGridLevel; trace: ScrambleTraceStep[] } {
  const random = createSeededRandom(seedHex);
  const scrambleMoves = options.scrambleMoves ?? 48;
  const lockedCount = options.lockedCount ?? 3;
  const difficulty = options.difficulty ?? 2;

  const minPathLength = Math.min(18, 7 + difficulty * 2);
  const tiles = baseSolvedTiles(random, minPathLength);
  addLockedTiles(tiles, random, lockedCount);

  let empty = pickInitialEmpty(tiles, random);
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
    scrambleMoves: 22 + safeLevel * 8,
    lockedCount: Math.min(12, 1 + Math.floor(safeLevel / 2)),
    difficulty: Math.min(5, 1 + Math.floor(safeLevel / 2))
  };
}
