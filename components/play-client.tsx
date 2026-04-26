'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
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

const PUZZLE_NAMES = [
  'Mechanical Maze', 'Steel Circuit', 'Iron Conduit', 'Copper Gate', 'Forge Junction',
  'Steam Engine', 'Pipe Dream', 'Pressure Valve', 'Flow State', 'Boiler Room',
  'The Labyrinth', 'Circuit Breaker', 'Ironworks', 'The Crucible', 'Vapor Lock',
  'Clockwork', 'Reactor Core', 'The Manifold', 'Pressure Drop', 'Heat Sink',
  'Pipeline', 'The Conduit', 'Alloy Bridge', 'Weld Point', 'Flux Tunnel'
];

function getPuzzleName(dateKey: string): string {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  return PUZZLE_NAMES[hash % PUZZLE_NAMES.length];
}

type PlayPhase = 'briefing' | 'playing' | 'cleared';

function pulseFeedback(pattern: number | number[]) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}

function findBestHintTile(level: PipeGridLevel): { row: number; col: number } | null {
  const base = findReachableFromStart(level).length;
  let best: { row: number; col: number } | null = null;
  let bestScore = base;
  for (let row = 0; row < level.size; row++) {
    for (let col = 0; col < level.size; col++) {
      const pos = { row, col };
      if (!canSlide(level, pos)) continue;
      const score = findReachableFromStart(slideTile(level, pos)).length;
      if (score > bestScore) { bestScore = score; best = pos; }
    }
  }
  return best;
}

function buildShareText(name: string, dayKey: string, moves: number, stars: 1|2|3, secs: number): string {
  const starStr = ['⭐','⭐⭐','⭐⭐⭐'][stars - 1];
  const m = Math.floor(secs / 60), s = secs % 60;
  const time = m > 0 ? `${m}m ${s}s` : `${s}s`;
  return `The Grid — ${name}\n${dayKey}\n${starStr} · ${moves} moves · ${time}`;
}

function weekProgress(activity: Record<string, { solved: boolean }>): number {
  const today = new Date();
  let count = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = formatDateKey(d);
    if (activity[key]?.solved) count++;
  }
  return count;
}

export function PlayClient() {
  const { data: session } = useSession();
  const [dayKey, setDayKey]       = useState('');
  const [level, setLevel]         = useState<PipeGridLevel | null>(null);
  const [moves, setMoves]         = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [streak, setStreak]       = useState(0);
  const [weekDays, setWeekDays]   = useState(0);
  const [solved, setSolved]       = useState(false);
  const [score, setScore]         = useState(0);
  const [stars, setStars]         = useState<1|2|3>(1);
  const [path, setPath]           = useState<Array<{row:number;col:number}>>([]);
  const [partialPath, setPartialPath] = useState<Array<{row:number;col:number}>>([]);
  const [hintTile, setHintTile]   = useState<{row:number;col:number}|null>(null);
  const [phase, setPhase]         = useState<PlayPhase>('briefing');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed]     = useState(0);
  const [copied, setCopied]       = useState(false);

  const puzzleName = useMemo(() => dayKey ? getPuzzleName(dayKey) : '', [dayKey]);

  async function loadForDay(dateKey: string) {
    const fixture = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('fixture') : null;
    const customPuzzle = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('puzzle') : null;

    let fresh: PipeGridLevel;
    if (customPuzzle) {
      try {
        const decoded = JSON.parse(atob(customPuzzle));
        fresh = decoded as PipeGridLevel;
      } catch {
        const seed = await createSeedHash(dateKey, SECRET);
        fresh = generatePipeGrid(seed);
      }
    } else if (fixture === 'easy-solve') {
      fresh = createEasySolveFixture();
    } else {
      const seed = await createSeedHash(dateKey, SECRET);
      fresh = generatePipeGrid(seed);
    }

    const progress = await getPuzzleProgress(dateKey);
    let nextLevel = fresh, nextMoves = 0, nextHints = 0;

    if (progress?.puzzleType === PUZZLE_TYPE) {
      nextLevel = applyProgress(fresh, progress.state as PipeGridProgressState);
      nextMoves = progress.moves;
      nextHints = progress.hintsUsed;
      setStartedAt(progress.startedAt ?? Date.now());
      setElapsed(progress.elapsedSeconds ?? 0);
      setPhase('playing');
    } else {
      setPhase('briefing');
      setStartedAt(null);
      setElapsed(0);
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
    const forced = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('day') : null;
    setDayKey(forced ?? formatDateKey(new Date()));
  }, []);

  useEffect(() => {
    if (!dayKey) return;
    let cancelled = false;
    loadForDay(dayKey).then(async () => {
      if (cancelled) return;
      const activity = await getAllDailyActivity();
      if (cancelled) return;
      const map = Object.fromEntries(activity.map((e) => [e.date, { solved: e.solved }]));
      setStreak(calculateStreak(map));
      setWeekDays(weekProgress(map));
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
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase, startedAt, solved]);

  async function persist(nextLevel: PipeGridLevel, nextMoves: number, nextHints: number) {
    await upsertPuzzleProgress({
      date: dayKey,
      puzzleType: PUZZLE_TYPE,
      state: toProgressState(nextLevel, nextMoves),
      hintsUsed: nextHints,
      startedAt: startedAt ?? Date.now(),
      elapsedSeconds: elapsed,
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
        date: dayKey, solved: true, score: finalScore, moves: nextMoves,
        timeTaken: elapsed, difficulty: nextLevel.difficulty, hintsUsed, stars: rating, synced: false
      });
      await clearPuzzleProgress(dayKey);

      if (session && navigator.onLine) {
        syncAllPending({ online: navigator.onLine, signedIn: Boolean(session) }).catch(() => {});
      }

      const activity = await getAllDailyActivity();
      const map = Object.fromEntries(activity.map((e) => [e.date, { solved: e.solved }]));
      setStreak(calculateStreak(map));
      setWeekDays(weekProgress(map));
      return;
    }

    setPartialPath(findReachableFromStart(nextLevel));
    await persist(nextLevel, nextMoves, hintsUsed);
  }

  async function useHint() {
    if (!level || solved || phase !== 'playing' || hintsUsed >= HINT_LIMIT) return;
    const next = hintsUsed + 1;
    setHintsUsed(next);
    const tile = findBestHintTile(level);
    setHintTile(tile);
    setTimeout(() => setHintTile(null), 2500);
    await persist(level, moves, next);
  }

  async function restart() {
    await clearPuzzleProgress(dayKey);
    setScore(0); setStars(1); setSolved(false);
    setPath([]); setPartialPath([]); setHintTile(null);
    await loadForDay(dayKey);
  }

  function startMission() {
    setStartedAt(Date.now());
    setElapsed(0);
    setPhase('playing');
  }

  async function shareResult() {
    const text = buildShareText(puzzleName, dayKey, moves, stars, elapsed);
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch { /* cancelled */ }
  }

  const timerLabel = useMemo(() => {
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [elapsed]);

  const hintsLeft = HINT_LIMIT - hintsUsed;
  const chestAt = [1, 3, 5, 7];

  if (!dayKey || !level) {
    return <main className="page-shell game-page"><p className="muted">Loading today&apos;s puzzle…</p></main>;
  }

  return (
    <main className="page-shell game-page">

      {/* ── Header ── */}
      <section className="panel game-brief-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="label-chip" style={{ marginBottom: 6 }}>Daily Challenge</div>
            <h1 style={{ marginBottom: 2 }}>Today&apos;s Puzzle: {puzzleName}</h1>
            <p className="muted" style={{ fontSize: '0.78rem' }}>
              {dayKey} · 🔥 {streak} day streak
            </p>
          </div>
          {phase === 'playing' && (
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent)', paddingTop: 4 }}>
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

      {/* ── Reward Track ── */}
      <div className="reward-track-wrap">
        <div className="reward-track-title">🎁 Reward Track</div>
        <div className="reward-track-days">Weekly Progress: {weekDays}/7 Days</div>
        <div className="reward-track-items">
          {chestAt.map((day, i) => (
            <span
              key={day}
              className={`reward-chest${i === chestAt.length - 1 ? ' final' : ''}${weekDays >= day ? ' unlocked' : ''}`}
              title={`Day ${day} reward`}
            >
              {weekDays >= day ? '🎁' : '🔒'}
            </span>
          ))}
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${(weekDays / 7) * 100}%` }} />
        </div>
      </div>

      {/* ── Board ── */}
      <PipeGridBoard
        level={level}
        onSlide={handleSlide}
        path={path}
        partialPath={partialPath}
        hintTile={hintTile}
      />

      {/* ── Controls ── */}
      <div className="action-row" style={{ justifyContent: 'center' }}>
        <button className="ghost-btn" onClick={useHint} disabled={hintsLeft === 0 || solved || phase !== 'playing'}>
          💡 Hint ({hintsLeft})
        </button>
        <button className="ghost-btn" onClick={restart}>↺ Restart</button>
        <Link className="ghost-btn" href="/levels">Campaign</Link>
      </div>

      {/* ── Briefing Modal ── */}
      {phase === 'briefing' && (
        <div className="modal-overlay">
          <div className="panel modal-card">
            <div className="label-chip" style={{ marginBottom: 8 }}>Daily Challenge</div>
            <h2 style={{ marginTop: 0 }}>Today&apos;s Puzzle</h2>
            <p style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 4 }}>{puzzleName}</p>
            <p className="muted" style={{ marginBottom: 14, fontSize: '0.85rem' }}>{dayKey}</p>
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1.8, marginBottom: 14 }}>
              <li>Slide tiles into the empty space to connect <strong>S → E</strong>.</li>
              <li>Only tiles adjacent to the blank can slide.</li>
              <li>Amber glow = your current connected chain.</li>
              <li>Green glow = the best tile to move (hints).</li>
              <li>Fewer moves = more stars ⭐</li>
            </ul>
            <button className="wood-btn" style={{ width: '100%' }} onClick={startMission}>
              Enter Puzzle
            </button>
          </div>
        </div>
      )}

      {/* ── Cleared Modal ── */}
      {phase === 'cleared' && (
        <div className="modal-overlay">
          <div className="panel modal-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: 6 }}>{'⭐'.repeat(stars)}</div>
            <h2 style={{ marginTop: 0 }}>Puzzle Cleared!</h2>
            <p style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 14 }}>{puzzleName}</p>

            <div className="kpi-row" style={{ margin: '0 0 14px' }}>
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

            <div className="share-box">{buildShareText(puzzleName, dayKey, moves, stars, elapsed)}</div>

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

    </main>
  );
}
