export type Direction = 'up' | 'right' | 'down' | 'left';

export type PipeShape =
  | 'straight-h'
  | 'straight-v'
  | 'corner-ur'
  | 'corner-rd'
  | 'corner-dl'
  | 'corner-lu';

export type Tile = {
  id: string;
  kind: 'empty' | 'start' | 'end' | 'pipe';
  shape?: PipeShape;
  locked?: boolean;
};

export type GridPosition = { row: number; col: number };

export type PipeGridLevel = {
  size: number;
  tiles: Tile[][];
  empty: GridPosition;
  start: GridPosition;
  end: GridPosition;
  difficulty: number;
};

export type PipeGridProgressState = {
  tiles: Tile[][];
  empty: GridPosition;
  moves: number;
};
