'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { computeDailyScore, computeStars } from '@/lib/core/scoring';
import { createSeedHash } from '@/lib/core/seed';
import { syncAllPending } from '@/lib/client/sync';
import { addLevelRun, getAllLevelRuns, upsertPuzzleProgress } from '@/lib/storage/db';
import { canSlide, slideTile, toProgressState } from '@/lib/puzzles/pipe-grid/gameplay';
import { generatePipeGrid, levelConfig, levelTargets } from '@/lib/puzzles/pipe-grid/generator';
import type { PipeGridLevel } from '@/lib/puzzles/pipe-grid/types';
import { findConnectedPath, findReachableFromStart } from '@/lib/puzzles/pipe-grid/validator';
import { PipeGridBoard, MiniPuzzleGrid } from '@/lib/puzzles/pipe-grid/ui/PipeGridBoard';
import { findConnectedPath, findReachableFromStart, hasConnectedPath } from '@/lib/puzzles/pipe-grid/validator';
import { PipeGridBoard } from '@/lib/puzzles/pipe-grid/ui/PipeGridBoard';

const SECRET = 'logic-looper-v1';
const HINT_LIMIT = 2;
const MAX_LEVELS = 50;

type Phase = 'world' | 'briefing' | 'playing' | 'cleared';
type RunRecord = { stars: number; moves: number };

type ChapterDef = {
  id: number;
  name: string;
  subtitle: string;
  emoji: string;
  color: string;
  levels: [number, number]; // [first, last]
};

const CHAPTERS: ChapterDef[] = [
  { id: 1, name: 'Copper District',  subtitle: 'Master the basics.',          emoji: '🔧', color: '#b87333', levels: [1,  5]  },
  { id: 2, name: 'Steam Harbor',     subtitle: 'Navigate industrial pressure.',emoji: '⚙️', color: '#708090', levels: [6,  10] },
  { id: 3, name: 'Obsidian Vault',   subtitle: 'Precision in tight corridors.',emoji: '🪨', color: '#6a5acd', levels: [11, 15] },
  { id: 4, name: 'Aurora Core',      subtitle: 'High-energy conduit work.',    emoji: '⚡', color: '#7b2fff', levels: [16, 20] },
  { id: 5, name: 'Neon Labyrinth',   subtitle: 'Multi-path under pressure.',   emoji: '🌐', color: '#ff6b35', levels: [21, 30] },
  { id: 6, name: 'Deep Forge',       subtitle: 'Extreme lock density.',        emoji: '🔥', color: '#cc2200', levels: [31, 40] },
  { id: 7, name: 'Apex Grid',        subtitle: 'The final frontier.',          emoji: '👑', color: '#00ccaa', levels: [41, 50] }
];

function chapterOf(levelNo: number): ChapterDef {
  return CHAPTERS.find((c) => levelNo >= c.levels[0] && levelNo <= c.levels[1]) ?? CHAPTERS[0];
}


type Phase = 'briefing' | 'playing' | 'cleared';

function pulseFeedback(pattern: number | number[]) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}

function findBestHintTile(level: PipeGridLevel): { row: number; col: number } | null {
  const base = findReachableFromStart(level).length;
  let best: { row: number; col: number } | null = null;
  let bestScore = base;
  const baseScore = findReachableFromStart(level).length;
  let best: { row: number; col: number } | null = null;
  let bestScore = baseScore;
  for (let row = 0; row < level.size; row++) {
    for (let col = 0; col < level.size; col++) {
      const pos = { row, col };
      if (!canSlide(level, pos)) continue;
      const score = findReachableFromStart(slideTile(level, pos)).length;
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
  const [phase, setPhase]             = useState<Phase>('world');
  const [activeChapter, setChapter]   = useState<ChapterDef>(CHAPTERS[0]);
  const [levelNumber, setLevelNumber] = useState(1);
  const [board, setBoard]             = useState<PipeGridLevel | null>(null);
  const [levelBoards, setLevelBoards] = useState<Record<number, PipeGridLevel>>({});
  const [moves, setMoves]             = useState(0);
  const [hintsUsed, setHintsUsed]     = useState(0);
  const [best, setBest]               = useState<RunRecord | null>(null);
  const [runs, setRuns]               = useState<Record<number, RunRecord>>({});
  const [partialPath, setPartialPath] = useState<Array<{row:number;col:number}>>([]);
  const [hintTile, setHintTile]       = useState<{row:number;col:number}|null>(null);
  const [path, setPath]               = useState<Array<{row:number;col:number}>>([]);
  const [startedAt, setStartedAt]     = useState<number | null>(null);
  const [elapsed, setElapsed]         = useState(0);
  const [clearedStars, setClearedStars]   = useState<1|2|3>(1);
  const [clearedScore, setClearedScore]   = useState(0);
  const [clearedMoves, setClearedMoves]   = useState(0);
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

  const targets = useMemo(() => levelTargets(levelNumber), [levelNumber]);

  const timerLabel = useMemo(() => {
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }, [elapsed]);

  useEffect(() => {
    if (phase !== 'playing' || !startedAt) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
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
    const grouped: Record<number, RunRecord> = {};
    for (const run of all) {
      if (!grouped[run.level] || run.moves < grouped[run.level].moves) {
        grouped[run.level] = { stars: run.stars, moves: run.moves };
      }
    }
    setRuns(grouped);
  }, []);

  // Pre-load thumbnail boards for visible chapter
  const loadChapterThumbs = useCallback(async (chapter: ChapterDef) => {
    const [first, last] = chapter.levels;
    const loaded: Record<number, PipeGridLevel> = {};
    await Promise.all(
      Array.from({ length: last - first + 1 }, (_, i) => first + i).map(async (lvl) => {
        const cfg  = levelConfig(lvl);
        const seed = await createSeedHash(`level-${lvl}`, SECRET);
        loaded[lvl] = generatePipeGrid(seed, cfg);
      })
    );
    setLevelBoards((prev) => ({ ...prev, ...loaded }));
  }, []);

  const load = useCallback(async (levelNo: number) => {
    const cfg  = levelConfig(levelNo);
    const seed = await createSeedHash(`level-${levelNo}`, SECRET);
    const nb   = generatePipeGrid(seed, cfg);
    setBoard(nb);
    setMoves(0); setHintsUsed(0);
    setPath([]); setPartialPath(findReachableFromStart(nb));
    setHintTile(null); setStartedAt(null); setElapsed(0);
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
    setBest(run ?? null);
  }, [runs]);

  useEffect(() => { refreshRuns(); }, [refreshRuns]);
  useEffect(() => { loadChapterThumbs(CHAPTERS[0]); }, [loadChapterThumbs]);

  async function selectChapter(ch: ChapterDef) {
    const firstLvl = ch.levels[0];
    if (firstLvl > unlockedLevel) return;
    setChapter(ch);
    setPhase('briefing');
    setLevelNumber(firstLvl);
    await loadChapterThumbs(ch);
    await load(firstLvl);
  }

  async function selectLevel(lvl: number) {
    if (lvl > unlockedLevel) return;
    setLevelNumber(lvl);
    setPhase('briefing');
    await load(lvl);
  }

  function startLevel() {
    setStartedAt(Date.now());
    setElapsed(0);
    setPhase('playing');
  }
  useEffect(() => { load(levelNumber); }, [levelNumber, load]);

  async function handleSlide(from: { row: number; col: number }) {
    if (!board || phase !== 'playing' || !canSlide(board, from)) return;
    const next = slideTile(board, from);
    const nextMoves = moves + 1;
    setBoard(next); setMoves(nextMoves);
    setBoard(next);
    setMoves(nextMoves);
    setHintTile(null);
    pulseFeedback(12);

    const solvedPath = findConnectedPath(next);
    if (solvedPath.length > 0) {
      const score = computeDailyScore(nextMoves + levelNumber * 2, hintsUsed);
      const stars = computeStars(nextMoves, next.difficulty);
      setPath(solvedPath); setPartialPath([]);
      setClearedStars(stars); setClearedScore(score); setClearedMoves(nextMoves);

      setPath(solvedPath);
      setPartialPath([]);
      setClearedStars(stars);
      setClearedScore(score);
      setClearedMoves(nextMoves);
      setPhase('cleared');
      pulseFeedback([18, 45, 18]);

      await addLevelRun({
        id: `level-${levelNumber}-${Date.now()}`,
        level: levelNumber, solved: true, score, moves: nextMoves,
        hintsUsed, stars, playedAt: Date.now(), synced: false
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
        syncAllPending({ online: navigator.onLine, signedIn: Boolean(session) }).catch(() => {});
        syncAllPending({ online: navigator.onLine, signedIn: Boolean(session) }).catch(() => undefined);
      }
      await refreshRuns();
      return;
    }

    setPartialPath(findReachableFromStart(next));
    await upsertPuzzleProgress({
      date: `level-${levelNumber}`, puzzleType: 'pipe-grid-level',
      state: toProgressState(next, nextMoves), hintsUsed,
      startedAt: startedAt ?? Date.now(), elapsedSeconds: elapsed, moves: nextMoves
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

  async function replayLevel() {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    await load(levelNumber);
    setPhase('briefing');
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
    setLevelNumber(next);
    setPhase('briefing');
    await load(next);
  }

  if (!board) return null;

  const chapter = chapterOf(levelNumber);
  const hintsLeft = HINT_LIMIT - hintsUsed;

  // ── WORLD MAP VIEW ──────────────────────────────────────
  if (phase === 'world') {
    return (
      <main className="page-shell game-page">
        <section className="panel" style={{ marginBottom: 14 }}>
          <div className="label-chip" style={{ marginBottom: 8 }}>Campaign Mode</div>
          <h1 style={{ marginBottom: 4 }}>World Map</h1>
          <p className="muted" style={{ marginBottom: 0 }}>
            {Object.keys(runs).length} / {MAX_LEVELS} levels cleared
          </p>
          <div className="progress-bar-wrap" style={{ marginTop: 8 }}>
            <div className="progress-bar-fill"
              style={{ width: `${(Object.keys(runs).length / MAX_LEVELS) * 100}%` }} />
          </div>
        </section>

        <div className="world-grid">
          {CHAPTERS.map((ch) => {
            const [first, last] = ch.levels;
            const total    = last - first + 1;
            const cleared  = Object.keys(runs).filter((k) => {
              const n = Number(k);
              return n >= first && n <= last;
            }).length;
            const locked = first > unlockedLevel;
            const pct = Math.round((cleared / total) * 100);

            return (
              <button
                key={ch.id}
                className={`world-chapter-card${locked ? ' locked' : ''}`}
                onClick={() => !locked && selectChapter(ch)}
                disabled={locked}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '2.2rem' }}>{locked ? '🔒' : ch.emoji}</span>
                  <div style={{ textAlign: 'left' }}>
                    <strong style={{ display: 'block', color: locked ? 'var(--muted)' : ch.color }}>
                      {ch.name}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      Levels {first}–{last}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '4px 0', textAlign: 'left' }}>
                  {ch.subtitle}
                </p>
                <div>
                  <div className="chapter-progress-label">{locked ? 'Locked' : `Progress: ${pct}%`}</div>
                  <div className="progress-bar-wrap" style={{ marginTop: 0 }}>
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: ch.color }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    );
  }

  // ── CHAPTER LEVEL-SELECT VIEW + GAME ─────────────────────
  const [firstLvl, lastLvl] = activeChapter.levels;

  return (
    <main className="page-shell game-page">

      {/* Back + chapter header */}
      <section className="panel" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <button
              className="ghost-btn"
              style={{ minHeight: 32, padding: '0 12px', fontSize: '0.8rem', marginBottom: 8 }}
              onClick={() => setPhase('world')}
            >
              ← World Map
            </button>
            <h2 style={{ margin: 0, color: activeChapter.color }}>{activeChapter.name}</h2>
            <p className="muted" style={{ fontSize: '0.78rem', margin: '2px 0 0' }}>{activeChapter.subtitle}</p>
          </div>
          {phase === 'playing' && (
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent)' }}>
              {timerLabel}
            </span>
          )}
        </div>

        {/* HUD — only when playing */}
        {phase === 'playing' && (
          <div className="hud-grid" style={{ marginTop: 10 }}>
            <div><small>Level</small><strong>{levelNumber}</strong></div>
            <div><small>Moves</small><strong>{moves}</strong></div>
            <div><small>Hints</small><strong>{hintsLeft}</strong></div>
            <div><small>Best</small><strong>{best ? `${best.moves}m` : '—'}</strong></div>
          </div>
        )}

        {phase === 'playing' && (
          <div className="target-strip" style={{ marginTop: 8 }}>
            <span>🥇 ≤{targets.goldMaxMoves}m</span>
            <span>🥈 ≤{targets.silverMaxMoves}m</span>
            <span>🥉 ≤{targets.bronzeMaxMoves}m</span>
          </div>
        )}
      </section>

      {/* Level grid */}
      <section className="panel" style={{ marginBottom: 12 }}>
        <h3 style={{ marginTop: 0, marginBottom: 10 }}>
          Levels {firstLvl}–{lastLvl}
        </h3>
        <div className="level-grid">
          {Array.from({ length: lastLvl - firstLvl + 1 }, (_, i) => firstLvl + i).map((lvl) => {
            const locked  = lvl > unlockedLevel;
            const run     = runs[lvl];
            const isActive = lvl === levelNumber;
            const thumb   = levelBoards[lvl];

            return (
              <button
                key={lvl}
                className={`level-card${isActive ? ' active' : ''}${locked ? ' locked' : ''}`}
                onClick={() => !locked && selectLevel(lvl)}
                disabled={locked}
              >
                {thumb ? (
                  <MiniPuzzleGrid level={thumb} />
                ) : (
                  <div style={{ width: 72, height: 72, background: 'rgba(0,0,0,.3)', borderRadius: 6 }} />
                )}
                <span className="level-num">Level {lvl}</span>
                <span className="level-stars">
                  {locked
                    ? '🔒'
                    : run
                    ? '⭐'.repeat(run.stars)
                    : <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Open</span>
                  }
                </span>
                {run && <span className="level-moves">{run.moves}m best</span>}
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

      {/* Board */}
      {(phase === 'briefing' || phase === 'playing') && (
        <PipeGridBoard
          level={board}
          onSlide={handleSlide}
          path={path}
          partialPath={partialPath}
          hintTile={hintTile}
        />
      )}

      {/* Controls */}
      {phase === 'playing' && (
        <div className="action-row" style={{ justifyContent: 'center' }}>
          <button className="ghost-btn" onClick={useHint} disabled={hintsLeft === 0}>
            💡 Hint ({hintsLeft})
          </button>
          <button className="ghost-btn" onClick={replayLevel}>↺ Restart</button>
        </div>
      )}

      {/* Briefing Modal */}
      {phase === 'briefing' && (
        <div className="modal-overlay">
          <div className="panel modal-card">
            <p style={{ margin: '0 0 2px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: chapter.color }}>
              {chapter.name}
            </p>
            <h2 style={{ marginTop: 4, marginBottom: 4 }}>Level {levelNumber}</h2>
            <p className="muted" style={{ marginBottom: 12, fontSize: '0.85rem' }}>{chapter.subtitle}</p>
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
                Your best: <strong>{best.moves} moves</strong> — can you beat it?
              </p>
            )}
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.8, marginBottom: 14 }}>
              <li>Slide tiles into the empty space to connect <strong>S → E</strong>.</li>
              <li>Amber glow = your live connected chain.</li>
              <li>Green glow = the best hint tile to move next.</li>
            </ul>

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

      {/* Cleared Modal */}
      {/* ── Cleared Modal ── */}
      {phase === 'cleared' && (
        <div className="modal-overlay">
          <div className="panel modal-card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.4rem', marginBottom: 4 }}>{'⭐'.repeat(clearedStars)}</div>
            <h2 style={{ marginTop: 0, marginBottom: 2 }}>Level {levelNumber} Cleared!</h2>
            <p className="muted" style={{ fontSize: '0.8rem', marginBottom: 14 }}>{chapter.name}</p>

            <div className="kpi-row" style={{ margin: '0 0 14px' }}>
              <div className="kpi-card"><span className="kpi-value">{clearedMoves}</span><span className="kpi-label">moves</span></div>
              <div className="kpi-card"><span className="kpi-value">{timerLabel}</span><span className="kpi-label">time</span></div>
              <div className="kpi-card"><span className="kpi-value">{clearedScore}</span><span className="kpi-label">score</span></div>
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
              {levelNumber < MAX_LEVELS && (
                <button className="wood-btn" onClick={nextStage}>
                  {levelNumber < unlockedLevel ? 'Next Level →' : 'Unlock Next →'}
                </button>
              )}
              <button className="ghost-btn" onClick={replayLevel}>Replay</button>
              <button className="ghost-btn" onClick={() => setPhase('world')}>World Map</button>
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

    </main>
  );
}
