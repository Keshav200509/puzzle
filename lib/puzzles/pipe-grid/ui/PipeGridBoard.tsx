'use client';

import { useMemo } from 'react';
import type { Direction, GridPosition, PipeGridLevel, Tile } from '../types';

const EDGE: Record<Direction, { x: number; y: number }> = {
  up:    { x: 50, y: 0   },
  right: { x: 100, y: 50 },
  down:  { x: 50, y: 100 },
  left:  { x: 0,  y: 50  }
};

const SHAPE_PATHS: Record<string, { d: string; openings: Direction[] }> = {
  'straight-h': { d: 'M 0 50 L 100 50',                        openings: ['left', 'right']           },
  'straight-v': { d: 'M 50 0 L 50 100',                        openings: ['up', 'down']              },
  'corner-ur':  { d: 'M 50 0 Q 50 50 100 50',                  openings: ['up', 'right']             },
  'corner-rd':  { d: 'M 100 50 Q 50 50 50 100',                openings: ['right', 'down']           },
  'corner-dl':  { d: 'M 50 100 Q 50 50 0 50',                  openings: ['down', 'left']            },
  'corner-lu':  { d: 'M 0 50 Q 50 50 50 0',                    openings: ['left', 'up']              },
  't-up':       { d: 'M 0 50 L 100 50 M 50 50 L 50 0',         openings: ['up', 'left', 'right']     },
  't-right':    { d: 'M 50 0 L 50 100 M 50 50 L 100 50',       openings: ['up', 'right', 'down']     },
  't-down':     { d: 'M 0 50 L 100 50 M 50 50 L 50 100',       openings: ['down', 'left', 'right']   },
  't-left':     { d: 'M 50 0 L 50 100 M 0 50 L 50 50',         openings: ['up', 'left', 'down']      },
  'cross':      { d: 'M 0 50 L 100 50 M 50 0 L 50 100',        openings: ['up', 'right', 'down', 'left'] }
};

function isAdjacent(a: GridPosition, b: GridPosition): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

// Unique gradient IDs per render to avoid conflicts across multiple boards on the same page
let gradientCounter = 0;

function tileSvg(tile: Tile, onPath: boolean, onPartial: boolean, uid: string) {
  if (tile.kind === 'empty') return null;

  const pipeDark  = '#1a0802';
  const pipeMid   = '#2c1208';
  const glowColor = onPath
    ? 'rgba(253,230,138,1)'
    : onPartial
    ? 'rgba(245,158,11,.7)'
    : 'rgba(0,0,0,.18)';

  const bgId  = `bg-${uid}`;
  const bgIdS = `bg-s-${uid}`;

  if (tile.kind === 'start' || tile.kind === 'end') {
    const isStart  = tile.kind === 'start';
    const pipeD    = isStart ? 'M 50 50 L 100 50' : 'M 0 50 L 50 50';
    const label    = isStart ? 'S' : 'E';
    const labelCol = isStart ? '#10b981' : '#f59e0b';

    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
        <defs>
          <linearGradient id={bgIdS} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#d4924a" />
            <stop offset="100%" stopColor="#9a6a28" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" rx="8" fill={`url(#${bgIdS})`} />
        <rect x="2" y="2" width="96" height="4" rx="2" fill="rgba(255,255,255,.18)" />
        <path d={pipeD} stroke={pipeDark} strokeWidth={38} strokeLinecap="round" fill="none" />
        <path d={pipeD} stroke={pipeMid}  strokeWidth={32} strokeLinecap="round" fill="none" />
        <path d={pipeD} stroke={glowColor} strokeWidth={10} strokeLinecap="round" fill="none" />
        <text x="50" y="56" fontSize="22" textAnchor="middle" dominantBaseline="middle"
          fill={labelCol} fontWeight="800" fontFamily="system-ui" style={{ userSelect: 'none' }}>
          {label}
        </text>
      </svg>
    );
  }

  const shape = tile.shape ? SHAPE_PATHS[tile.shape] : undefined;
  if (!shape) return null;

  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={tile.locked ? '#8a6230' : '#c9914a'} />
          <stop offset="100%" stopColor={tile.locked ? '#5a3f1a' : '#9a6a28'} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="100" rx="8" fill={`url(#${bgId})`} />
      <rect x="2" y="2" width="96" height="4" rx="2"
        fill={tile.locked ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.22)'} />
      <path d={shape.d} stroke={pipeDark} strokeWidth={40} strokeLinecap="round" fill="none" />
      <path d={shape.d} stroke={pipeMid}  strokeWidth={32} strokeLinecap="round" fill="none" />
      <path d={shape.d} stroke={glowColor} strokeWidth={10} strokeLinecap="round" fill="none" />
      {shape.openings.map((edge) => {
        const p = EDGE[edge];
        return <circle key={edge} cx={p.x} cy={p.y} r="14" fill={pipeDark} />;
      })}
      {tile.locked && (
        <text x="50" y="55" fontSize="28" textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,.55)" style={{ userSelect: 'none' }}>
          🔒
        </text>
      )}
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
  const uid = useMemo(() => `b${++gradientCounter}`, []);

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
            onPath:    pathSet.has(key),
            onPartial: !pathSet.has(key) && partialSet.has(key),
            isHint:    hintTile?.row === rowIndex && hintTile?.col === colIndex
          };
        })
      ),
    [level, pathSet, partialSet, hintTile]
  );

  const unit = 100;
  const pathPoints = path
    .map((p) => `${p.col * unit + unit / 2},${p.row * unit + unit / 2}`)
    .join(' ');
  const pathD = path
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.col * unit + unit / 2} ${p.row * unit + unit / 2}`)
    .join(' ');

  return (
    <div className="pipe-board-shell">
      <p className="pipe-objective">Slide tiles · Connect S → E · Fewest moves wins</p>
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
            ].filter(Boolean).join(' ');

            return (
              <button
                key={`${rowIndex}-${colIndex}-${tile.id}`}
                type="button"
                disabled={!canMove}
                onClick={() => onSlide({ row: rowIndex, col: colIndex })}
                className={classes}
                aria-label={`tile-${rowIndex}-${colIndex}`}
              >
                {tileSvg(tile, onPath, onPartial, `${uid}-${rowIndex}-${colIndex}`)}
              </button>
            );
          })}
        </div>

        {path.length > 1 && (
          <svg
            width="100%" height="100%"
            viewBox={`0 0 ${level.size * unit} ${level.size * unit}`}
            className="pipe-path-overlay"
          >
            <polyline
              className="path-glow"
              points={pathPoints}
              fill="none"
              stroke="rgba(250,204,21,.65)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d={pathD} fill="none" stroke="transparent" id={`route-${uid}`} />
            <circle r="9" fill="#fde68a" className="route-ball">
              <animateMotion dur="1.8s" repeatCount="indefinite" rotate="auto">
                <mpath href={`#route-${uid}`} />
              </animateMotion>
            </circle>
          </svg>
        )}
      </div>
    </div>
  );
}

/** Tiny thumbnail for level-select cards */
export function MiniPuzzleGrid({ level }: { level: PipeGridLevel }) {
  const size = level.size;
  const cell = 14;
  const gap = 2;
  const total = size * cell + (size - 1) * gap;

  return (
    <svg
      width={total} height={total}
      viewBox={`0 0 ${total} ${total}`}
      aria-hidden
      style={{ display: 'block' }}
    >
      {level.tiles.flatMap((row, r) =>
        row.map((tile, c) => {
          const x = c * (cell + gap);
          const y = r * (cell + gap);
          let fill = '#6b4a1a';
          if (tile.kind === 'empty') fill = 'rgba(0,0,0,.35)';
          if (tile.kind === 'start') fill = '#10b981';
          if (tile.kind === 'end')   fill = '#f59e0b';
          if (tile.locked)            fill = '#4a3010';
          return (
            <rect key={`${r}-${c}`} x={x} y={y} width={cell} height={cell}
              rx="2" fill={fill} />
          );
        })
      )}
    </svg>
  );
}
