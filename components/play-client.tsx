'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { BottomNav } from '@/components/bottom-nav';
import { formatDateKey, hasDayRolledOver } from '@/lib/core/date';
import { computeDailyScore, computeStars } from '@/lib/core/scoring';
import { createSeedHash } from '@/lib/core/seed';
import { calculateStreak } from '@/lib/core/streak';
import { applyProgress, canSlide, slideTile, toProgressState } from '@/lib/puzzles/pipe-grid/gameplay';
import { generatePipeGrid } from '@/lib/puzzles/pipe-grid/generator';
import { createEasySolveFixture } from '@/lib/puzzles/pipe-grid/fixtures';
import type { PipeGridLevel, PipeGridProgressState } from '@/lib/puzzles/pipe-grid/types';
import { findConnectedPath, hasConnectedPath } from '@/lib/puzzles/pipe-grid/validator';
import { PipeGridBoard } from '@/lib/puzzles/pipe-grid/ui/PipeGridBoard';
import { syncAllPending } from '@/lib/client/sync';
import { clearPuzzleProgress, getAllDailyActivity, getPuzzleProgress, upsertDailyActivity, upsertPuzzleProgress } from '@/lib/storage/db';

const SECRET = 'logic-looper-v1';
const PUZZLE_TYPE = 'pipe-grid';
const HINT_LIMIT = 3;

export function PlayClient() {
  const { data: session } = useSession();
  const [dayKey, setDayKey] = useState(() => {
    if (typeof window !== 'undefined') {
      const forcedDay = new URLSearchParams(window.location.search).get('day');
      if (forcedDay) return forcedDay;
    }
    return formatDateKey(new Date());
  });
  const [level, setLevel] = useState<PipeGridLevel | null>(null);
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState<1 | 2 | 3>(1);
  const [path, setPath] = useState<Array<{ row: number; col: number }>>([]);

  async function loadForDay(dateKey: string) {
    const fixture = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('fixture') : null;
    const seed = await createSeedHash(dateKey, SECRET);
    const fresh = fixture === 'easy-solve' ? createEasySolveFixture() : generatePipeGrid(seed);
    const progress = await getPuzzleProgress(dateKey);

    let nextLevel = fresh;
    let nextMoves = 0;
    let nextHints = 0;

    if (progress?.puzzleType === PUZZLE_TYPE) {
      nextLevel = applyProgress(fresh, progress.state as PipeGridProgressState);
      nextMoves = progress.moves;
      nextHints = progress.hintsUsed;
    }

    setLevel(nextLevel);
    setMoves(nextMoves);
    setHintsUsed(nextHints);
    const solvedNow = hasConnectedPath(nextLevel);
    setSolved(solvedNow);
    setPath(solvedNow ? findConnectedPath(nextLevel) : []);
  }

  useEffect(() => {
    let cancelled = false;
    loadForDay(dayKey).then(async () => {
      if (cancelled) return;
      const activity = await getAllDailyActivity();
      if (cancelled) return;
      const mapped = Object.fromEntries(activity.map((entry) => [entry.date, { solved: entry.solved }]));
      setStreak(calculateStreak(mapped));
    });
    return () => {
      cancelled = true;
    };
  }, [dayKey]);

  useEffect(() => {
    const id = setInterval(() => {
      if (hasDayRolledOver(dayKey)) setDayKey(formatDateKey(new Date()));
    }, 15000);
    return () => clearInterval(id);
  }, [dayKey]);

  async function persist(nextLevel: PipeGridLevel, nextMoves: number, nextHintsUsed: number) {
    await upsertPuzzleProgress({
      date: dayKey,
      puzzleType: PUZZLE_TYPE,
      state: toProgressState(nextLevel, nextMoves),
      hintsUsed: nextHintsUsed,
      startedAt: Date.now(),
      elapsedSeconds: 0,
      moves: nextMoves
    });
  }

  async function handleSlide(from: { row: number; col: number }) {
    if (!level || solved || !canSlide(level, from)) return;

    const nextLevel = slideTile(level, from);
    const nextMoves = moves + 1;
    setLevel(nextLevel);
    setMoves(nextMoves);

    const solvedPath = findConnectedPath(nextLevel);
    if (solvedPath.length > 0) {
      const finalScore = computeDailyScore(nextMoves, hintsUsed);
      const rating = computeStars(nextMoves, nextLevel.difficulty);
      setScore(finalScore);
      setStars(rating);
      setSolved(true);
      setPath(solvedPath);
      await upsertDailyActivity({
        date: dayKey,
        solved: true,
        score: finalScore,
        moves: nextMoves,
        timeTaken: 0,
        difficulty: nextLevel.difficulty,
        hintsUsed,
        stars: rating,
        synced: false
      });
      await clearPuzzleProgress(dayKey);

      if (session && navigator.onLine) {
        await syncAllPending({ online: navigator.onLine, signedIn: Boolean(session) }).catch(() => undefined);
      }

      const activity = await getAllDailyActivity();
      const mapped = Object.fromEntries(activity.map((entry) => [entry.date, { solved: entry.solved }]));
      setStreak(calculateStreak(mapped));
      return;
    }

    await persist(nextLevel, nextMoves, hintsUsed);
  }

  async function useHint() {
    if (!level || solved || hintsUsed >= HINT_LIMIT) return;
    const nextHints = hintsUsed + 1;
    setHintsUsed(nextHints);
    await persist(level, moves, nextHints);
  }

  async function restart() {
    await clearPuzzleProgress(dayKey);
    await loadForDay(dayKey);
    setScore(0);
    setStars(1);
    setSolved(false);
    setPath([]);
  }

  const starLabel = useMemo(() => '⭐'.repeat(stars), [stars]);

  if (!level) return <main className="page-shell game-page">Loading today&apos;s board…</main>;

  return (
    <main className="page-shell game-page">
      <section className="panel hud-card">
        <h1 style={{ marginTop: 0 }}>Daily Puzzle</h1>
        <p className="muted">Day {dayKey}</p>
        <div className="hud-grid">
          <div><small>Moves</small><strong>{moves}</strong></div>
          <div><small>Hints Left</small><strong>{HINT_LIMIT - hintsUsed}</strong></div>
          <div><small>Streak</small><strong>{streak}</strong></div>
          <div><small>Target</small><strong>Low moves</strong></div>
        </div>
      </section>

      <PipeGridBoard level={level} onSlide={handleSlide} path={path} />

      <div className="action-row">
        <button className="wood-btn" onClick={useHint} disabled={hintsUsed >= HINT_LIMIT || solved}>Hint</button>
        <button className="ghost-btn" onClick={restart}>Restart</button>
        <Link className="ghost-btn" href="/levels">Level Mode</Link>
      </div>

      {solved && (
        <div className="modal-overlay">
          <div className="panel modal-card">
            <h2 style={{ marginTop: 0 }}>Puzzle Cleared!</h2>
            <p>Moves: {moves}</p>
            <p>Score: {score}</p>
            <p>{starLabel}</p>
            <div className="action-row" style={{ marginTop: 8 }}>
              <Link href="/home" className="wood-btn">Home</Link>
              <Link href="/stats" className="ghost-btn">Stats</Link>
              <button className="wood-btn" onClick={restart}>Play Again</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
