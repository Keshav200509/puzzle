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
import { findConnectedPath, findReachableFromStart, hasConnectedPath } from '@/lib/puzzles/pipe-grid/validator';
import { PipeGridBoard } from '@/lib/puzzles/pipe-grid/ui/PipeGridBoard';
import { syncAllPending } from '@/lib/client/sync';
import {
  clearPuzzleProgress,
  getAllDailyActivity,
  getPuzzleProgress,
  upsertDailyActivity,
  upsertPuzzleProgress
} from '@/lib/storage/db';

const SECRET = 'logic-looper-v1';
const PUZZLE_TYPE = 'pipe-grid';
const HINT_LIMIT = 3;

type PlayPhase = 'briefing' | 'playing' | 'cleared';

function pulseFeedback(pattern: number | number[]) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}

/** Simulate every legal slide; return the tile whose move maximises the
 *  number of positions reachable from START. Returns null if no single
 *  slide improves reachability. */
function findBestHintTile(level: PipeGridLevel): { row: number; col: number } | null {
  const baseScore = findReachableFromStart(level).length;
  let best: { row: number; col: number } | null = null;
  let bestScore = baseScore;

  for (let row = 0; row < level.size; row++) {
    for (let col = 0; col < level.size; col++) {
      const pos = { row, col };
      if (!canSlide(level, pos)) continue;
      const sim = slideTile(level, pos);
      const score = findReachableFromStart(sim).length;
      if (score > bestScore) { bestScore = score; best = pos; }
    }
  }
  return best;
}

function buildShareText(dayKey: string, moves: number, stars: 1 | 2 | 3, secs: number): string {
  const starStr = ['⭐', '⭐⭐', '⭐⭐⭐'][stars - 1];
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const timeStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
  return `The Grid – ${dayKey}\n${starStr} ${moves} moves · ${timeStr}`;
}

export function PlayClient() {
  const { data: session } = useSession();
  const [dayKey, setDayKey] = useState('');
  const [level, setLevel] = useState<PipeGridLevel | null>(null);
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState<1 | 2 | 3>(1);
  const [path, setPath] = useState<Array<{ row: number; col: number }>>([]);
  const [partialPath, setPartialPath] = useState<Array<{ row: number; col: number }>>([]);
  const [hintTile, setHintTile] = useState<{ row: number; col: number } | null>(null);
  const [phase, setPhase] = useState<PlayPhase>('briefing');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copied, setCopied] = useState(false);

  async function loadForDay(dateKey: string) {
    const fixture =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('fixture')
        : null;
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
      setStartedAt(progress.startedAt ?? Date.now());
      setElapsedSeconds(progress.elapsedSeconds ?? 0);
      setPhase('playing');
    } else {
      setPhase('briefing');
      setStartedAt(null);
      setElapsedSeconds(0);
    }

    setLevel(nextLevel);
    setMoves(nextMoves);
    setHintsUsed(nextHints);
    setHintTile(null);

    const solvedNow = hasConnectedPath(nextLevel);
    setSolved(solvedNow);
    if (solvedNow) {
      setPath(findConnectedPath(nextLevel));
      setPartialPath([]);
      setPhase('cleared');
    } else {
      setPath([]);
      setPartialPath(findReachableFromStart(nextLevel));
    }
  }

  useEffect(() => {
    const forcedDay =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('day')
        : null;
    setDayKey(forcedDay ?? formatDateKey(new Date()));
  }, []);

  useEffect(() => {
    if (!dayKey) return;
    let cancelled = false;
    loadForDay(dayKey).then(async () => {
      if (cancelled) return;
      const activity = await getAllDailyActivity();
      if (cancelled) return;
      const mapped = Object.fromEntries(activity.map((e) => [e.date, { solved: e.solved }]));
      setStreak(calculateStreak(mapped));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey]);

  useEffect(() => {
    if (!dayKey) return;
    const id = setInterval(() => {
      if (hasDayRolledOver(dayKey)) setDayKey(formatDateKey(new Date()));
    }, 15000);
    return () => clearInterval(id);
  }, [dayKey]);

  useEffect(() => {
    if (phase !== 'playing' || !startedAt || solved) return;
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, startedAt, solved]);

  async function persist(nextLevel: PipeGridLevel, nextMoves: number, nextHints: number) {
    await upsertPuzzleProgress({
      date: dayKey,
      puzzleType: PUZZLE_TYPE,
      state: toProgressState(nextLevel, nextMoves),
      hintsUsed: nextHints,
      startedAt: startedAt ?? Date.now(),
      elapsedSeconds,
      moves: nextMoves
    });
  }

  async function handleSlide(from: { row: number; col: number }) {
    if (!level || solved || phase !== 'playing' || !canSlide(level, from)) return;

    const nextLevel = slideTile(level, from);
    const nextMoves = moves + 1;
    setLevel(nextLevel);
    setMoves(nextMoves);
    setHintTile(null);
    pulseFeedback(12);

    const solvedPath = findConnectedPath(nextLevel);
    if (solvedPath.length > 0) {
      const finalScore = computeDailyScore(nextMoves, hintsUsed);
      const rating = computeStars(nextMoves, nextLevel.difficulty);
      setScore(finalScore);
      setStars(rating);
      setSolved(true);
      setPath(solvedPath);
      setPartialPath([]);
      setPhase('cleared');
      pulseFeedback([18, 45, 18]);

      await upsertDailyActivity({
        date: dayKey,
        solved: true,
        score: finalScore,
        moves: nextMoves,
        timeTaken: elapsedSeconds,
        difficulty: nextLevel.difficulty,
        hintsUsed,
        stars: rating,
        synced: false
      });
      await clearPuzzleProgress(dayKey);

      if (session && navigator.onLine) {
        syncAllPending({ online: navigator.onLine, signedIn: Boolean(session) }).catch(() => undefined);
      }

      const activity = await getAllDailyActivity();
      const mapped = Object.fromEntries(activity.map((e) => [e.date, { solved: e.solved }]));
      setStreak(calculateStreak(mapped));
      return;
    }

    setPartialPath(findReachableFromStart(nextLevel));
    await persist(nextLevel, nextMoves, hintsUsed);
  }

  async function useHint() {
    if (!level || solved || phase !== 'playing' || hintsUsed >= HINT_LIMIT) return;
    const nextHints = hintsUsed + 1;
    setHintsUsed(nextHints);

    const best = findBestHintTile(level);
    setHintTile(best);
    setTimeout(() => setHintTile(null), 2500);

    await persist(level, moves, nextHints);
  }

  async function restart() {
    await clearPuzzleProgress(dayKey);
    setScore(0);
    setStars(1);
    setSolved(false);
    setPath([]);
    setPartialPath([]);
    setHintTile(null);
    await loadForDay(dayKey);
  }

  function startMission() {
    setStartedAt(Date.now());
    setElapsedSeconds(0);
    setPhase('playing');
  }

  async function shareResult() {
    const text = buildShareText(dayKey, moves, stars, elapsedSeconds);
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch { /* cancelled */ }
  }

  const timerLabel = useMemo(() => {
    const m = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const s = (elapsedSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [elapsedSeconds]);

  const hintsLeft = HINT_LIMIT - hintsUsed;

  if (!dayKey || !level) {
    return <main className="page-shell game-page"><p className="muted">Loading today&apos;s puzzle…</p></main>;
  }

  return (
    <main className="page-shell game-page">

      <section className="panel game-brief-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ marginBottom: 2 }}>Daily Puzzle</h1>
            <p className="muted" style={{ fontSize: '0.78rem' }}>{dayKey} · 🔥 {streak} day streak</p>
          </div>
          {phase === 'playing' && (
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)' }}>
              {timerLabel}
            </span>
          )}
        </div>

        <div className="hud-grid">
          <div><small>Moves</small><strong>{moves}</strong></div>
          <div><small>Hints left</small><strong>{hintsLeft}</strong></div>
          <div><small>Streak</small><strong>{streak}🔥</strong></div>
          <div><small>Timer</small><strong>{timerLabel}</strong></div>
        </div>

        {phase === 'briefing' && (
          <div className="action-row">
            <button className="wood-btn" onClick={startMission}>Start Puzzle</button>
            <Link className="ghost-btn" href="/home">Back</Link>
          </div>
        )}
      </section>

      <PipeGridBoard
        level={level}
        onSlide={handleSlide}
        path={path}
        partialPath={partialPath}
        hintTile={hintTile}
      />

      <div className="action-row" style={{ justifyContent: 'center' }}>
        <button
          className="ghost-btn"
          onClick={useHint}
          disabled={hintsLeft === 0 || solved || phase !== 'playing'}
        >
          💡 Hint ({hintsLeft})
        </button>
        <button className="ghost-btn" onClick={restart}>↺ Restart</button>
        <Link className="ghost-btn" href="/levels">Campaign</Link>
      </div>

      {phase === 'briefing' && (
        <div className="modal-overlay">
          <div className="panel modal-card">
            <h2 style={{ marginTop: 0 }}>Today&apos;s Puzzle</h2>
            <p className="muted" style={{ marginBottom: 12 }}>{dayKey}</p>
            <p>Slide tiles into the empty space to connect <strong>S</strong> → <strong>E</strong> through a chain of aligned pipes.</p>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.8 }}>
              <li>Only tiles <em>adjacent to the blank</em> can slide.</li>
              <li>Fewer moves = more stars ⭐</li>
              <li>Amber tiles show your current connected chain.</li>
              <li>Hints highlight the best tile to move next (green glow).</li>
            </ul>
            <button className="wood-btn" style={{ width: '100%', marginTop: 8 }} onClick={startMission}>
              Enter Puzzle
            </button>
          </div>
        </div>
      )}

      {phase === 'cleared' && (
        <div className="modal-overlay">
          <div className="panel modal-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.2rem', marginBottom: 6 }}>{'⭐'.repeat(stars)}</div>
            <h2 style={{ marginTop: 0 }}>Puzzle Cleared!</h2>

            <div className="kpi-row" style={{ margin: '14px 0' }}>
              <div className="kpi-card">
                <span className="kpi-value">{moves}</span>
                <span className="kpi-label">moves</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-value">{timerLabel}</span>
                <span className="kpi-label">time</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-value">{score}</span>
                <span className="kpi-label">score</span>
              </div>
            </div>

            <div className="share-box">{buildShareText(dayKey, moves, stars, elapsedSeconds)}</div>

            <div className="action-row" style={{ justifyContent: 'center' }}>
              <button className="wood-btn" onClick={shareResult}>
                {copied ? '✓ Copied!' : '↑ Share result'}
              </button>
              <Link href="/stats" className="ghost-btn">My Stats</Link>
            </div>
            <div className="action-row" style={{ justifyContent: 'center' }}>
              <button className="ghost-btn" onClick={restart}>Replay</button>
              <Link href="/home" className="ghost-btn">Home</Link>
              <Link href="/levels" className="ghost-btn">Campaign</Link>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
