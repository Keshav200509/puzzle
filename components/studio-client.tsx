'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { PipeShape, Tile, PipeGridLevel } from '@/lib/puzzles/pipe-grid/types';
import { PipeGridBoard } from '@/lib/puzzles/pipe-grid/ui/PipeGridBoard';
import { canSlide, slideTile } from '@/lib/puzzles/pipe-grid/gameplay';
import { findConnectedPath, findReachableFromStart } from '@/lib/puzzles/pipe-grid/validator';

// ─── Palette definitions ─────────────────────────────────
type PaletteItem = { id: string; label: string; icon: string; shape?: PipeShape; kind?: Tile['kind'] };

const PALETTE: PaletteItem[] = [
  { id: 'straight-h', label: 'Straight H', icon: '━', shape: 'straight-h' },
  { id: 'straight-v', label: 'Straight V', icon: '┃', shape: 'straight-v' },
  { id: 'corner-ur',  label: 'Corner',     icon: '╰', shape: 'corner-ur'  },
  { id: 'corner-rd',  label: 'Corner',     icon: '╭', shape: 'corner-rd'  },
  { id: 'corner-dl',  label: 'Corner',     icon: '╮', shape: 'corner-dl'  },
  { id: 'corner-lu',  label: 'Corner',     icon: '╯', shape: 'corner-lu'  },
  { id: 't-up',       label: 'T-junction', icon: '┴', shape: 't-up'       },
  { id: 't-right',    label: 'T-junction', icon: '├', shape: 't-right'    },
  { id: 't-down',     label: 'T-junction', icon: '┬', shape: 't-down'     },
  { id: 't-left',     label: 'T-junction', icon: '┤', shape: 't-left'     },
  { id: 'cross',      label: 'Cross',      icon: '┼', shape: 'cross'      },
  { id: 'start',      label: 'Start Point',icon: '▶', kind: 'start'       },
  { id: 'end',        label: 'End Point',  icon: '▷', kind: 'end'         },
  { id: 'empty',      label: 'Eraser',     icon: '⬜', kind: 'empty'      }
];

const GRID_SIZES = [4, 5, 6, 7];

// ─── helpers ─────────────────────────────────────────────
function makeEmptyGrid(size: number): Tile[][] {
  return Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ({
      id: `tile-${r}-${c}`,
      kind: 'empty' as const
    }))
  );
}

function buildLevel(grid: Tile[][], size: number): PipeGridLevel | null {
  let start: { row: number; col: number } | null = null;
  let end: { row: number; col: number } | null = null;
  let emptyPos: { row: number; col: number } | null = null;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const t = grid[r][c];
      if (t.kind === 'start') start = { row: r, col: c };
      if (t.kind === 'end')   end   = { row: r, col: c };
      if (t.kind === 'empty') emptyPos = { row: r, col: c };
    }
  }

  if (!start || !end || !emptyPos) return null;

  return {
    size,
    tiles: grid.map((row) => row.map((t) => ({ ...t }))),
    empty: emptyPos,
    start,
    end,
    difficulty: 2
  };
}

export function StudioClient() {
  const [gridSize, setGridSize]       = useState(5);
  const [grid, setGrid]               = useState<Tile[][]>(() => makeEmptyGrid(5));
  const [selected, setSelected]       = useState<PaletteItem>(PALETTE[0]);
  const [testLevel, setTestLevel]     = useState<PipeGridLevel | null>(null);
  const [testPath, setTestPath]       = useState<{row:number;col:number}[]>([]);
  const [testPartial, setTestPartial] = useState<{row:number;col:number}[]>([]);
  const [shareUrl, setShareUrl]       = useState('');
  const [copied, setCopied]           = useState(false);
  const [error, setError]             = useState('');

  // Place a tile on the studio grid
  const placeTile = useCallback((row: number, col: number) => {
    setGrid((prev) => {
      const next = prev.map((r) => r.map((t) => ({ ...t })));
      const item = selected;
      if (item.kind === 'empty') {
        next[row][col] = { id: `tile-${row}-${col}`, kind: 'empty' };
      } else if (item.kind === 'start' || item.kind === 'end') {
        // Remove old start/end first
        for (let r = 0; r < next.length; r++) {
          for (let c = 0; c < next[r].length; c++) {
            if (next[r][c].kind === item.kind) next[r][c] = { id: `tile-${r}-${c}`, kind: 'empty' };
          }
        }
        next[row][col] = { id: `tile-${row}-${col}`, kind: item.kind, locked: true };
      } else if (item.shape) {
        next[row][col] = { id: `tile-${row}-${col}`, kind: 'pipe', shape: item.shape };
      }
      return next;
    });
    setShareUrl('');
    setError('');
  }, [selected]);

  const resetGrid = () => {
    setGrid(makeEmptyGrid(gridSize));
    setTestLevel(null);
    setTestPath([]);
    setTestPartial([]);
    setShareUrl('');
    setError('');
  };

  const changeSize = (size: number) => {
    setGridSize(size);
    setGrid(makeEmptyGrid(size));
    setTestLevel(null);
    setShareUrl('');
  };

  const testPuzzle = () => {
    const level = buildLevel(grid, gridSize);
    if (!level) {
      setError('Place a Start (▶) and End (▷) tile, and leave at least one empty space.');
      return;
    }
    setError('');
    setTestLevel(level);
    setTestPath([]);
    setTestPartial(findReachableFromStart(level));
  };

  const handleTestSlide = (from: { row: number; col: number }) => {
    if (!testLevel || !canSlide(testLevel, from)) return;
    const next = slideTile(testLevel, from);
    const solvedPath = findConnectedPath(next);
    setTestLevel(next);
    if (solvedPath.length > 0) {
      setTestPath(solvedPath);
      setTestPartial([]);
    } else {
      setTestPartial(findReachableFromStart(next));
    }
  };

  const publish = () => {
    const level = buildLevel(grid, gridSize);
    if (!level) {
      setError('Place a Start and End tile first.');
      return;
    }
    try {
      const encoded = btoa(JSON.stringify(level));
      const url = `${window.location.origin}/play?puzzle=${encoded}`;
      setShareUrl(url);
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    } catch {
      setError('Failed to encode puzzle.');
    }
  };

  const hasStart = grid.some((r) => r.some((t) => t.kind === 'start'));
  const hasEnd   = grid.some((r) => r.some((t) => t.kind === 'end'));
  const canTest  = hasStart && hasEnd;

  return (
    <main className="page-shell">
      <section className="panel" style={{ marginBottom: 14 }}>
        <div className="label-chip" style={{ marginBottom: 8 }}>Puzzle Builder</div>
        <h1 style={{ marginBottom: 4 }}>Creative Studio</h1>
        <p className="muted">Design your own pipe puzzle, test it, and share via link.</p>
        <div className="action-row" style={{ marginTop: 10 }}>
          <Link href="/home" className="ghost-btn">← HQ</Link>
        </div>
      </section>

      <div className="studio-layout">

        {/* ── Tile Palette ── */}
        <aside>
          <div className="panel" style={{ padding: 12 }}>
            <h3 style={{ marginTop: 0, marginBottom: 10 }}>Tile Palette</h3>
            <div className="studio-palette">
              {PALETTE.map((item) => (
                <button
                  key={item.id}
                  className={`palette-item${selected.id === item.id ? ' selected' : ''}`}
                  onClick={() => setSelected(item)}
                >
                  <span className="palette-icon" style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Grid Editor ── */}
        <div className="studio-grid-wrap">
          <div className="panel" style={{ padding: 12 }}>
            <div className="studio-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                <span className="muted">Grid:</span>
                {GRID_SIZES.map((s) => (
                  <button
                    key={s}
                    className={`ghost-btn${gridSize === s ? ' active' : ''}`}
                    style={{ minHeight: 32, padding: '0 12px', fontSize: '0.8rem' }}
                    onClick={() => changeSize(s)}
                  >
                    {s}×{s}
                  </button>
                ))}
              </div>
              <button
                className="ghost-btn"
                style={{ minHeight: 36, padding: '0 14px', fontSize: '0.82rem' }}
                onClick={resetGrid}
              >
                🗑 Clear
              </button>
              <button
                className="wood-btn"
                style={{ minHeight: 36, padding: '0 16px', fontSize: '0.82rem' }}
                onClick={testPuzzle}
                disabled={!canTest}
              >
                ▶ Test Level
              </button>
              <button
                className="wood-btn"
                style={{ minHeight: 36, padding: '0 16px', fontSize: '0.82rem', background: 'linear-gradient(135deg,#10b981,#059669)' }}
                onClick={publish}
                disabled={!canTest}
              >
                ↑ Publish
              </button>
            </div>

            {error && (
              <p style={{ color: 'var(--red)', fontSize: '0.82rem', marginTop: 8 }}>{error}</p>
            )}

            {shareUrl && (
              <div className="share-box" style={{ marginTop: 10, fontSize: '0.75rem', wordBreak: 'break-all' }}>
                {shareUrl}
                {copied && <span style={{ color: 'var(--green)', marginLeft: 8 }}>✓ Copied!</span>}
              </div>
            )}
          </div>

          <div className="panel" style={{ padding: 10 }}>
            <div
              className="studio-grid"
              style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, maxWidth: 480, margin: '0 auto' }}
            >
              {grid.flatMap((row, r) =>
                row.map((tile, c) => {
                  const isStart = tile.kind === 'start';
                  const isEnd   = tile.kind === 'end';
                  const isPipe  = tile.kind === 'pipe';
                  const isEmpty = tile.kind === 'empty';
                  return (
                    <button
                      key={`${r}-${c}`}
                      className={`studio-cell${isEmpty ? ' empty-cell' : ''}`}
                      onClick={() => placeTile(r, c)}
                      style={{
                        background: isStart
                          ? 'rgba(16,185,129,.35)'
                          : isEnd
                          ? 'rgba(245,158,11,.35)'
                          : isPipe
                          ? 'rgba(201,145,74,.5)'
                          : undefined,
                        borderColor: isStart
                          ? '#10b981'
                          : isEnd
                          ? 'var(--accent)'
                          : isPipe
                          ? 'rgba(201,145,74,.4)'
                          : undefined
                      }}
                      aria-label={`cell-${r}-${c}`}
                    >
                      {isStart && <span style={{ fontSize: '1.1rem' }}>S</span>}
                      {isEnd   && <span style={{ fontSize: '1.1rem' }}>E</span>}
                      {isPipe  && (
                        <span style={{ fontSize: '0.9rem', fontFamily: 'monospace', opacity: 0.7 }}>
                          {PALETTE.find((p) => p.shape === tile.shape)?.icon ?? '○'}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Preview / Test ── */}
        <div className="studio-preview-wrap">
          <div className="panel" style={{ padding: 12 }}>
            <h3 style={{ marginTop: 0, marginBottom: 10 }}>Game Preview</h3>
            {testLevel ? (
              <>
                {testPath.length > 0 && (
                  <p style={{ color: 'var(--green)', fontWeight: 700, marginBottom: 8, fontSize: '0.85rem' }}>
                    ✓ Solvable!
                  </p>
                )}
                <PipeGridBoard
                  level={testLevel}
                  onSlide={handleTestSlide}
                  path={testPath}
                  partialPath={testPartial}
                />
                <button
                  className="ghost-btn"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={testPuzzle}
                >
                  ↺ Reset Test
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--muted)' }}>
                <p style={{ fontSize: '2rem', marginBottom: 8 }}>🎮</p>
                <p style={{ fontSize: '0.85rem' }}>
                  Place tiles and hit <strong>▶ Test Level</strong> to preview your puzzle here.
                </p>
              </div>
            )}
          </div>

          <div className="panel" style={{ padding: 12 }}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Tips</h3>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 1.8 }}>
              <li>Click a palette tile, then click a grid cell to place it.</li>
              <li>You <strong>must</strong> place exactly one Start (▶) and one End (▷).</li>
              <li>Leave one cell empty — it&apos;s the sliding space.</li>
              <li>Use ⬜ Eraser to clear any cell.</li>
              <li>Publish copies a share link to your clipboard.</li>
            </ul>
          </div>
        </div>

      </div>
    </main>
  );
}
