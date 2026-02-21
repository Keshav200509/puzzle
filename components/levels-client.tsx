'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { BottomNav } from '@/components/bottom-nav';
import { computeDailyScore, computeStars } from '@/lib/core/scoring';
import { createSeedHash } from '@/lib/core/seed';
import { syncAllPending } from '@/lib/client/sync';
import { addLevelRun, getAllLevelRuns, upsertPuzzleProgress } from '@/lib/storage/db';
import { canSlide, slideTile, toProgressState } from '@/lib/puzzles/pipe-grid/gameplay';
import { generatePipeGrid, levelConfig } from '@/lib/puzzles/pipe-grid/generator';
import type { PipeGridLevel } from '@/lib/puzzles/pipe-grid/types';
import { hasConnectedPath } from '@/lib/puzzles/pipe-grid/validator';
import { PipeGridBoard } from '@/lib/puzzles/pipe-grid/ui/PipeGridBoard';

const SECRET = 'logic-looper-v1';
const HINT_LIMIT = 2;

export function LevelsClient() {
  const { data: session } = useSession();
  const [levelNumber, setLevelNumber] = useState(1);
  const [board, setBoard] = useState<PipeGridLevel | null>(null);
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [best, setBest] = useState<{ score: number; moves: number } | null>(null);
  const [runs, setRuns] = useState<Record<number, { stars: number; moves: number }>>({});

  const unlockedLevel = useMemo(() => Math.max(1, Object.keys(runs).length + 1), [runs]);

  const refreshRuns = useCallback(async () => {
    const all = await getAllLevelRuns();
    const grouped: Record<number, { stars: number; moves: number }> = {};
    for (const run of all) {
      if (!grouped[run.level] || run.moves < grouped[run.level].moves) {
        grouped[run.level] = { stars: run.stars, moves: run.moves };
      }
    }
    setRuns(grouped);
  }, []);

  const load = useCallback(async (levelNo: number) => {
    const cfg = levelConfig(levelNo);
    const seed = await createSeedHash(`level-${levelNo}`, SECRET);
    setBoard(generatePipeGrid(seed, cfg));
    setMoves(0);
    setHintsUsed(0);

    const run = runs[levelNo];
    setBest(run ? { score: computeDailyScore(run.moves + levelNo * 2, 0), moves: run.moves } : null);
  }, [runs]);

  useEffect(() => {
    refreshRuns();
  }, [refreshRuns]);

  useEffect(() => {
    load(levelNumber);
  }, [levelNumber, load]);

  async function handleSlide(from: { row: number; col: number }) {
    if (!board || !canSlide(board, from)) return;
    const next = slideTile(board, from);
    const nextMoves = moves + 1;
    setBoard(next);
    setMoves(nextMoves);

    if (hasConnectedPath(next)) {
      const score = computeDailyScore(nextMoves + levelNumber * 2, hintsUsed);
      const stars = computeStars(nextMoves, next.difficulty);
      const runId = `level-${levelNumber}-${Date.now()}`;
      await addLevelRun({
        id: runId,
        level: levelNumber,
        solved: true,
        score,
        moves: nextMoves,
        hintsUsed,
        stars,
        playedAt: Date.now(),
        synced: false
      });

      if (session && navigator.onLine) {
        await syncAllPending({ online: navigator.onLine, signedIn: Boolean(session) }).catch(() => undefined);
      }

      await refreshRuns();
      await load(levelNumber);
      return;
    }

    await upsertPuzzleProgress({
      date: `level-${levelNumber}`,
      puzzleType: 'pipe-grid-level',
      state: toProgressState(next, nextMoves),
      hintsUsed,
      startedAt: Date.now(),
      elapsedSeconds: 0,
      moves: nextMoves
    });
  }

  if (!board) return <main className="page-shell game-page">Loading level…</main>;

  return (
    <main className="page-shell game-page">
      <section className="panel hud-card">
        <h1 style={{ marginTop: 0 }}>Level Mode</h1>
        <p className="muted">Level {levelNumber} • Difficulty {levelConfig(levelNumber).difficulty}</p>
        <div className="hud-grid">
          <div><small>Moves</small><strong>{moves}</strong></div>
          <div><small>Hints</small><strong>{HINT_LIMIT - hintsUsed}</strong></div>
          <div><small>Best</small><strong>{best ? `${best.moves} moves` : '—'}</strong></div>
          <div><small>Best Score</small><strong>{best ? best.score : '—'}</strong></div>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 10 }}>
        <h3 style={{ marginTop: 0 }}>Level Map</h3>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
          {Array.from({ length: 20 }, (_, idx) => idx + 1).map((lvl) => {
            const locked = lvl > unlockedLevel;
            const solved = runs[lvl];
            return (
              <button key={lvl} className={`ghost-btn ${lvl === levelNumber ? 'active' : ''}`} disabled={locked} onClick={() => setLevelNumber(lvl)} style={{ minWidth: 90 }}>
                <div>Level {lvl}</div>
                <small>{locked ? '🔒 Locked' : solved ? `⭐${solved.stars} • ${solved.moves}m` : 'Open'}</small>
              </button>
            );
          })}
        </div>
        <button className="wood-btn" onClick={() => setLevelNumber((v) => Math.min(unlockedLevel, v + 1))} style={{ marginTop: 8 }}>
          Continue
        </button>
      </section>

      <PipeGridBoard level={board} onSlide={handleSlide} />

      <div className="action-row">
        <button className="ghost-btn" onClick={() => setLevelNumber((v) => Math.max(1, v - 1))}>Prev</button>
        <button className="ghost-btn" onClick={() => setLevelNumber((v) => Math.min(unlockedLevel, v + 1))}>Next</button>
        <button className="wood-btn" onClick={() => setHintsUsed((v) => Math.min(HINT_LIMIT, v + 1))} disabled={hintsUsed >= HINT_LIMIT}>Use Hint</button>
      </div>

      <BottomNav />
    </main>
  );
}
