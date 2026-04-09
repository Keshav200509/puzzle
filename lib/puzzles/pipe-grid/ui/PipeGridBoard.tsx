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

function tileSvg(tile: Tile, onPath: boolean, onPartial: boolean) {
  if (tile.kind === 'empty') return null;

  const tunnelW = 34;
  const glowColor = onPath ? 'rgba(253,230,138,.55)' : onPartial ? 'rgba(245,158,11,.35)' : 'rgba(255,255,255,.1)';

  if (tile.kind === 'start' || tile.kind === 'end') {
    const isStart = tile.kind === 'start';
    const center = isStart ? 'M 50 50 L 100 50' : 'M 0 50 L 50 50';
    const label = isStart ? 'S' : 'E';
    const labelColor = isStart ? '#10b981' : '#f59e0b';

    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
        <defs>
          <linearGradient id={`wood-${tile.kind}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#0f2040" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" rx="8" fill={`url(#wood-${tile.kind})`} />
        <path d={center} stroke="#0d1f38" strokeWidth={38} strokeLinecap="round" fill="none" />
        <path d={center} stroke="#111827" strokeWidth={tunnelW} strokeLinecap="round" fill="none" />
        <text x="50" y="55" fontSize="20" textAnchor="middle" dominantBaseline="middle" fill={labelColor} fontWeight="800" fontFamily="system-ui">{label}</text>
      </svg>
    );
  }

  const shape = tile.shape ? SHAPE_PATHS[tile.shape] : undefined;
  if (!shape) return null;

  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id="wood-pipe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a3a5c" />
          <stop offset="100%" stopColor="#0e2236" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" rx="8" fill="url(#wood-pipe)" />
      <path d={shape.d} stroke="#0d1f38" strokeWidth={38} strokeLinecap="round" fill="none" />
      <path d={shape.d} stroke="#1e3a5f" strokeWidth={34} strokeLinecap="round" fill="none" />
      <path d={shape.d} stroke={glowColor} strokeWidth={10} strokeLinecap="round" fill="none" />
      {shape.openings.map((edge) => {
        const p = EDGE[edge];
        return <circle key={edge} cx={p.x} cy={p.y} r="15" fill="#0d1f38" />;
      })}
    </svg>
  );
}

export function PipeGridBoard({
  level,
  onSlide,
  path = [],
  partialPath = [],
  hintTile = null
}: {
  level: PipeGridLevel;
  onSlide: (from: GridPosition) => void;
  path?: GridPosition[];
  partialPath?: GridPosition[];
  hintTile?: GridPosition | null;
}) {
  const pathSet = useMemo(
    () => new Set(path.map((p) => `${p.row}:${p.col}`)),
    [path]
  );
  const partialSet = useMemo(
    () => new Set(partialPath.map((p) => `${p.row}:${p.col}`)),
    [partialPath]
  );

  const cells = useMemo(
    () =>
      level.tiles.flatMap((row, rowIndex) =>
        row.map((tile, colIndex) => {
          const key = `${rowIndex}:${colIndex}`;
          return {
            tile,
            rowIndex,
            colIndex,
            canMove:
              tile.kind !== 'empty' &&
              !tile.locked &&
              isAdjacent(level.empty, { row: rowIndex, col: colIndex }),
            onPath: pathSet.has(key),
            onPartial: !pathSet.has(key) && partialSet.has(key),
            isHint: hintTile?.row === rowIndex && hintTile?.col === colIndex
          };
        })
      ),
    [level, pathSet, partialSet, hintTile]
  );

  const unit = 100;
  const pathD = path
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.col * unit + unit / 2} ${p.row * unit + unit / 2}`)
    .join(' ');
  const pathPoints = path
    .map((p) => `${p.col * unit + unit / 2},${p.row * unit + unit / 2}`)
    .join(' ');

  return (
    <div className="pipe-board-shell">
      <p className="pipe-objective">Slide tiles · Connect START → END · Fewest moves wins</p>
      <div className="pipe-grid-wrap">
        <div
          className="pipe-grid"
          style={{ gridTemplateColumns: `repeat(${level.size}, 1fr)` }}
        >
          {cells.map(({ tile, rowIndex, colIndex, canMove, onPath, onPartial, isHint }) => {
            const classes = [
              'pipe-tile',
              tile.kind === 'empty' ? 'empty' : '',
              tile.locked ? 'locked' : '',
              canMove ? 'movable' : '',
              onPartial ? 'on-partial-path' : '',
              isHint ? 'hint-tile' : ''
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={`${rowIndex}-${colIndex}-${tile.id}`}
                type="button"
                disabled={!canMove}
                onClick={() => onSlide({ row: rowIndex, col: colIndex })}
                className={classes}
                aria-label={`tile-${rowIndex}-${colIndex}`}
              >
                {tileSvg(tile, onPath, onPartial)}
              </button>
            );
          })}
        </div>

        {path.length > 1 && (
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${level.size * unit} ${level.size * unit}`}
            className="pipe-path-overlay"
          >
            <polyline
              className="path-glow"
              points={pathPoints}
              fill="none"
              stroke="rgba(250,204,21,.75)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d={pathD} fill="none" stroke="transparent" id="solve-route" />
            <circle r="9" fill="#fde68a" className="route-ball">
              <animateMotion dur="1.8s" repeatCount="indefinite" rotate="auto">
                <mpath href="#solve-route" />
              </animateMotion>
            </circle>
          </svg>
        )}
      </div>
    </div>
  );
}
