'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { BottomNav } from '@/components/bottom-nav';
import { computeDailyScore, computeStars } from '@/lib/core/scoring';
import { createSeedHash } from '@/lib/core/seed';
import { syncAllPending } from '@/lib/client/sync';
import { addLevelRun, getAllLevelRuns, upsertPuzzleProgress } from '@/lib/storage/db';
import { canSlide, slideTile, toProgressState } from '@/lib/puzzles/pipe-grid/gameplay';
import { generatePipeGrid, levelConfig, levelTargets } from '@/lib/puzzles/pipe-grid/generator';
import type { PipeGridLevel } from '@/lib/puzzles/pipe-grid/types';
import { findConnectedPath, findReachableFromStart, hasConnectedPath } from '@/lib/puzzles/pipe-grid/validator';
import { PipeGridBoard } from '@/lib/puzzles/pipe-grid/ui/PipeGridBoard';

const SECRET = 'logic-looper-v1';
const HINT_LIMIT = 2;
const MAX_LEVELS = 50;

type Phase = 'briefing' | 'playing' | 'cleared';

function pulseFeedback(pattern: number | number[]) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}

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

type ChapterInfo = { name: string; desc: string; color: string };

function chapterInfo(levelNumber: number): ChapterInfo {
  if (levelNumber <= 5)  return { name: 'Copper District',  desc: 'Master the basics of pipe routing.', color: '#b87333' };
  if (levelNumber <= 10) return { name: 'Steam Harbor',     desc: 'Navigate through industrial pressure.', color: '#708090' };
  if (levelNumber <= 15) return { name: 'Obsidian Vault',   desc: 'Precision routing in tight corridors.', color: '#7a6f8a' };
  if (levelNumber <= 20) return { name: 'Aurora Core',      desc: 'High-energy conduit alignment.', color: '#7b2fff' };
  if (levelNumber <= 30) return { name: 'Neon Labyrinth',   desc: 'Multi-path circuits under pressure.', color: '#ff6b35' };
  if (levelNumber <= 40) return { name: 'Deep Forge',       desc: 'Dense grids with extreme lock density.', color: '#cc2200' };
  return                        { name: 'Apex Grid',        desc: 'The final frontier of pipe engineering.', color: '#00ccaa' };
}

export function LevelsClient() {
  const { data: session } = useSession();
  const [levelNumber, setLevelNumber] = useState(1);
  const [board, setBoard] = useState<PipeGridLevel | null>(null);
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [best, setBest] = useState<{ score: number; moves: number } | null>(null);
  const [runs, setRuns] = useState<Record<number, { stars: number; moves: number }>>({});
  const [phase, setPhase] = useState<Phase>('briefing');
  const [partialPath, setPartialPath] = useState<Array<{ row: number; col: number }>>([]);
  const [hintTile, setHintTile] = useState<{ row: number; col: number } | null>(null);
  const [path, setPath] = useState<Array<{ row: number; col: number }>>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [clearedStars, setClearedStars] = useState<1 | 2 | 3>(1);
  const [clearedScore, setClearedScore] = useState(0);
  const [clearedMoves, setClearedMoves] = useState(0);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unlockedLevel = useMemo(
    () => Math.min(MAX_LEVELS, Math.max(1, Object.keys(runs).length + 1)),
    [runs]
  );
  const chapter = useMemo(() => chapterInfo(levelNumber), [levelNumber]);
  const targets = useMemo(() => levelTargets(levelNumber), [levelNumber]);

  const timerLabel = useMemo(() => {
    const m = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const s = (elapsedSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [elapsedSeconds]);

  // Live timer
  useEffect(() => {
    if (phase !== 'playing' || !startedAt) return;
    const id = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, startedAt]);

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
    const newBoard = generatePipeGrid(seed, cfg);

    setBoard(newBoard);
    setMoves(0);
    setHintsUsed(0);
    setPhase('briefing');
    setPath([]);
    setPartialPath(findReachableFromStart(newBoard));
    setHintTile(null);
    setStartedAt(null);
    setElapsedSeconds(0);

    const run = runs[levelNo];
    setBest(run ? { score: computeDailyScore(run.moves + levelNo * 2, 0), moves: run.moves } : null);
  }, [runs]);

  useEffect(() => { refreshRuns(); }, [refreshRuns]);
  useEffect(() => { load(levelNumber); }, [levelNumber, load]);

  async function handleSlide(from: { row: number; col: number }) {
    if (!board || phase !== 'playing' || !canSlide(board, from)) return;
    const next = slideTile(board, from);
    const nextMoves = moves + 1;
    setBoard(next);
    setMoves(nextMoves);
    setHintTile(null);
    pulseFeedback(12);

    const solvedPath = findConnectedPath(next);
    if (solvedPath.length > 0) {
      const score = computeDailyScore(nextMoves + levelNumber * 2, hintsUsed);
      const stars = computeStars(nextMoves, next.difficulty);

      setPath(solvedPath);
      setPartialPath([]);
      setClearedStars(stars);
      setClearedScore(score);
      setClearedMoves(nextMoves);
      setPhase('cleared');
      pulseFeedback([18, 45, 18]);

      await addLevelRun({
        id: `level-${levelNumber}-${Date.now()}`,
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
        syncAllPending({ online: navigator.onLine, signedIn: Boolean(session) }).catch(() => undefined);
      }
      await refreshRuns();
      return;
    }

    setPartialPath(findReachableFromStart(next));
    await upsertPuzzleProgress({
      date: `level-${levelNumber}`,
      puzzleType: 'pipe-grid-level',
      state: toProgressState(next, nextMoves),
      hintsUsed,
      startedAt: startedAt ?? Date.now(),
      elapsedSeconds,
      moves: nextMoves
    });
  }

  function useHint() {
    if (!board || phase !== 'playing' || hintsUsed >= HINT_LIMIT) return;
    setHintsUsed((v) => v + 1);
    const tile = findBestHintTile(board);
    setHintTile(tile);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHintTile(null), 2500);
  }

  function startLevel() {
    setStartedAt(Date.now());
    setElapsedSeconds(0);
    setPhase('playing');
  }

  async function replayLevel() {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    await load(levelNumber);
  }

  async function goToLevel(lvl: number) {
    if (lvl < 1 || lvl > MAX_LEVELS || lvl > unlockedLevel) return;
    setLevelNumber(lvl);
  }

  async function nextStage() {
    const next = Math.min(MAX_LEVELS, levelNumber + 1);
    if (next > unlockedLevel) return;
    setLevelNumber(next);
  }

  if (!board) return <main className="page-shell game-page"><p className="muted">Loading level…</p></main>;

  const hintsLeft = HINT_LIMIT - hintsUsed;
  // Show levels up to unlocked + 4 (preview), capped at MAX_LEVELS
  const visibleLevelCount = Math.min(MAX_LEVELS, unlockedLevel + 4);

  return (
    <main className="page-shell game-page">

      {/* ── Header HUD ── */}
      <section className="panel game-brief-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ marginBottom: 2 }}>Level {levelNumber}</h1>
            <p className="muted" style={{ fontSize: '0.78rem', fontWeight: 600, color: chapter.color }}>
              {chapter.name}
            </p>
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
          <div><small>Best</small><strong>{best ? `${best.moves}m` : '—'}</strong></div>
          <div><small>Timer</small><strong>{timerLabel}</strong></div>
        </div>

        <div className="target-strip">
          <span>🥇 ≤{targets.goldMaxMoves}m</span>
          <span>🥈 ≤{targets.silverMaxMoves}m</span>
          <span>🥉 ≤{targets.bronzeMaxMoves}m</span>
        </div>
      </section>

      {/* ── Board ── */}
      <PipeGridBoard
        level={board}
        onSlide={handleSlide}
        path={path}
        partialPath={partialPath}
        hintTile={hintTile}
      />

      {/* ── Controls ── */}
      <div className="action-row" style={{ justifyContent: 'center' }}>
        <button
          className="ghost-btn"
          onClick={useHint}
          disabled={hintsLeft === 0 || phase !== 'playing'}
        >
          💡 Hint ({hintsLeft})
        </button>
        <button className="ghost-btn" onClick={replayLevel}>↺ Restart</button>
        <button className="ghost-btn" onClick={() => goToLevel(levelNumber - 1)} disabled={levelNumber <= 1}>‹ Prev</button>
        <button className="ghost-btn" onClick={() => goToLevel(levelNumber + 1)} disabled={levelNumber >= unlockedLevel}>Next ›</button>
      </div>

      {/* ── Level Select Grid ── */}
      <section className="panel" style={{ marginBottom: 10 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Level Select</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
          {Array.from({ length: visibleLevelCount }, (_, i) => i + 1).map((lvl) => {
            const locked = lvl > unlockedLevel;
            const solved = runs[lvl];
            const isActive = lvl === levelNumber;
            return (
              <button
                key={lvl}
                className={`ghost-btn${isActive ? ' active' : ''}`}
                disabled={locked}
                onClick={() => setLevelNumber(lvl)}
                style={{ padding: '6px 4px', fontSize: '0.75rem', minHeight: 52 }}
              >
                <div style={{ fontWeight: 700 }}>{locked ? '🔒' : `L${lvl}`}</div>
                <small style={{ display: 'block', lineHeight: 1.3 }}>
                  {locked ? '' : solved ? '⭐'.repeat(solved.stars) : 'Open'}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Briefing Modal ── */}
      {phase === 'briefing' && (
        <div className="modal-overlay">
          <div className="panel modal-card">
            <p style={{ margin: '0 0 2px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: chapter.color }}>
              {chapter.name}
            </p>
            <h2 style={{ marginTop: 4, marginBottom: 4 }}>Level {levelNumber}</h2>
            <p className="muted" style={{ marginTop: 0, marginBottom: 12 }}>{chapter.desc}</p>

            <div className="target-strip" style={{ marginBottom: 12 }}>
              <span>🥇 ≤{targets.goldMaxMoves} moves</span>
              <span>🥈 ≤{targets.silverMaxMoves}</span>
              <span>🥉 ≤{targets.bronzeMaxMoves}</span>
            </div>

            {best && (
              <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 12 }}>
                Your best: <strong>{best.moves} moves</strong> — beat it?
              </p>
            )}

            <ul style={{ paddingLeft: '1.2rem', color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.8, marginBottom: 14 }}>
              <li>Slide tiles into the empty space to connect <strong>S → E</strong>.</li>
              <li>Amber tiles show your live connected chain.</li>
              <li>Green glow = best hint tile. Fewer moves = better medal.</li>
            </ul>

            <button className="wood-btn" style={{ width: '100%' }} onClick={startLevel}>
              Start Level
            </button>
          </div>
        </div>
      )}

      {/* ── Cleared Modal ── */}
      {phase === 'cleared' && (
        <div className="modal-overlay">
          <div className="panel modal-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: 4 }}>{'⭐'.repeat(clearedStars)}</div>
            <h2 style={{ marginTop: 0, marginBottom: 4 }}>Level {levelNumber} Cleared!</h2>
            <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 12 }}>{chapter.name}</p>

            <div className="kpi-row" style={{ margin: '0 0 14px' }}>
              <div className="kpi-card">
                <span className="kpi-value">{clearedMoves}</span>
                <span className="kpi-label">moves</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-value">{timerLabel}</span>
                <span className="kpi-label">time</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-value">{clearedScore}</span>
                <span className="kpi-label">score</span>
              </div>
            </div>

            {best && clearedMoves < best.moves && (
              <p style={{ color: 'var(--accent)', fontWeight: 700, marginBottom: 10, fontSize: '0.9rem' }}>
                🎉 New personal best!
              </p>
            )}

            <div className="action-row" style={{ justifyContent: 'center' }}>
              {levelNumber < unlockedLevel && levelNumber < MAX_LEVELS && (
                <button className="wood-btn" onClick={nextStage}>Next Level →</button>
              )}
              {levelNumber >= unlockedLevel && levelNumber < MAX_LEVELS && (
                <button className="wood-btn" onClick={nextStage}>Unlock Next →</button>
              )}
              <button className="ghost-btn" onClick={replayLevel}>Replay</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
