'use client';

import { useMemo } from 'react';
import type { Direction, GridPosition, PipeGridLevel, Tile } from '../types';

const EDGE: Record<Direction, { x: number; y: number }> = {
  up: { x: 50, y: 0 },
  right: { x: 100, y: 50 },
  down: { x: 50, y: 100 },
  left: { x: 0, y: 50 }
};

const SHAPE_PATHS: Record<string, { d: string; openings: Direction[] }> = {
  'straight-h': { d: 'M 0 50 L 100 50', openings: ['left', 'right'] },
  'straight-v': { d: 'M 50 0 L 50 100', openings: ['up', 'down'] },
  'corner-ur': { d: 'M 50 0 Q 50 50 100 50', openings: ['up', 'right'] },
  'corner-rd': { d: 'M 100 50 Q 50 50 50 100', openings: ['right', 'down'] },
  'corner-dl': { d: 'M 50 100 Q 50 50 0 50', openings: ['down', 'left'] },
  'corner-lu': { d: 'M 0 50 Q 50 50 50 0', openings: ['left', 'up'] }
};

function isAdjacent(a: GridPosition, b: GridPosition): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function tileSvg(tile: Tile) {
  if (tile.kind === 'empty') return null;
  const tunnelStroke = 34;

  if (tile.kind === 'start' || tile.kind === 'end') {
    const terminal = tile.kind === 'start' ? ['right'] : ['left'];
    const center = terminal[0] === 'right' ? 'M 50 50 L 100 50' : 'M 0 50 L 50 50';

    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
        <rect x="0" y="0" width="100" height="100" rx="10" fill="url(#wood)" />
        <path d={center} stroke="#2f1c0d" strokeWidth={38} strokeLinecap="round" fill="none" />
        <path d={center} stroke="#111827" strokeWidth={tunnelStroke} strokeLinecap="round" fill="none" />
        {terminal.map((edge) => {
          const p = EDGE[edge as Direction];
          return <circle key={edge} cx={p.x} cy={p.y} r="17" fill="#111827" />;
        })}
        <text x="50" y="70" fontSize="15" textAnchor="middle" fill="#fef3c7" fontWeight="700">{tile.kind === 'start' ? 'START' : 'END'}</text>
      </svg>
    );
  }

  const shape = tile.shape ? SHAPE_PATHS[tile.shape] : undefined;
  if (!shape) return null;

  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
      <rect x="0" y="0" width="100" height="100" rx="10" fill="url(#wood)" />
      <path d={shape.d} stroke="#2f1c0d" strokeWidth={38} strokeLinecap="round" fill="none" />
      <path d={shape.d} stroke="#111827" strokeWidth={34} strokeLinecap="round" fill="none" />
      <path d={shape.d} stroke="rgba(255,255,255,0.16)" strokeWidth={12} strokeLinecap="round" fill="none" />
      {shape.openings.map((edge) => {
        const p = EDGE[edge];
        return <circle key={edge} cx={p.x} cy={p.y} r="17" fill="#111827" />;
      })}
      <defs>
        <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d39a66" />
          <stop offset="100%" stopColor="#9a5d30" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function PipeGridBoard({
  level,
  onSlide,
  path = []
}: {
  level: PipeGridLevel;
  onSlide: (from: GridPosition) => void;
  path?: GridPosition[];
}) {
  const cells = useMemo(
    () =>
      level.tiles.flatMap((row, rowIndex) =>
        row.map((tile, colIndex) => ({
          tile,
          rowIndex,
          colIndex,
          canMove: tile.kind !== 'empty' && !tile.locked && isAdjacent(level.empty, { row: rowIndex, col: colIndex })
        }))
      ),
    [level]
  );

  const unit = 100;
  const pathPoints = path.map((point) => `${point.col * unit + unit / 2},${point.row * unit + unit / 2}`).join(' ');

  return (
    <div className="pipe-board-shell">
      <p className="muted pipe-objective">Objective: Slide tiles and connect START ➜ END in as few moves as possible.</p>
      <div className="pipe-grid-wrap">
        <div
          className="pipe-grid"
          style={{
            gridTemplateColumns: `repeat(${level.size}, minmax(54px, 1fr))`
          }}
        >
          {cells.map(({ tile, rowIndex, colIndex, canMove }) => (
            <button
              key={`${rowIndex}-${colIndex}-${tile.id}`}
              type="button"
              disabled={!canMove}
              onClick={() => onSlide({ row: rowIndex, col: colIndex })}
              className={`pipe-tile ${tile.kind === 'empty' ? 'empty' : ''} ${tile.locked ? 'locked' : ''} ${canMove ? 'movable' : ''}`}
              aria-label={`tile-${rowIndex}-${colIndex}`}
            >
              {tileSvg(tile)}
            </button>
          ))}
        </div>

        {path.length > 1 && (
          <svg width="100%" height="100%" viewBox={`0 0 ${level.size * unit} ${level.size * unit}`} className="pipe-path-overlay">
            <polyline
              className="path-glow"
              points={pathPoints}
              fill="none"
              stroke="rgba(250,204,21,.88)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
