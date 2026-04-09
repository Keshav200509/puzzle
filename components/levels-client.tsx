'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { BottomNav } from '@/components/bottom-nav';
import { computeDailyScore, computeStars } from '@/lib/core/scoring';
import { createSeedHash } from '@/lib/core/seed';
import { syncAllPending } from '@/lib/client/sync';
import { addLevelRun, clearPuzzleProgress, getAllLevelRuns, getOrCreatePlayerProfile, getPuzzleProgress, upsertPuzzleProgress } from '@/lib/storage/db';
import { applyProgress, canSlide, slideTile, toProgressState } from '@/lib/puzzles/pipe-grid/gameplay';
import { generatePipeGrid, levelConfig, levelTargets } from '@/lib/puzzles/pipe-grid/generator';
import type { PipeGridLevel, PipeGridProgressState } from '@/lib/puzzles/pipe-grid/types';
import { hasConnectedPath } from '@/lib/puzzles/pipe-grid/validator';
import { PipeGridBoard } from '@/lib/puzzles/pipe-grid/ui/PipeGridBoard';

const SECRET = 'logic-looper-v1';
const HINT_LIMIT = 2;

type Phase = 'briefing' | 'playing' | 'cleared';
function pulseFeedback(pattern: number | number[]) {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
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
  const [playerName, setPlayerName] = useState('Guest Explorer');

  const unlockedLevel = useMemo(() => {
    const solvedLevels = Object.keys(runs).map((value) => Number(value));
    const highestSolved = solvedLevels.length ? Math.max(...solvedLevels) : 0;
    return Math.max(1, highestSolved + 1);
  }, [runs]);

  const chapter = useMemo(() => {
    if (levelNumber <= 5) return 'Copper District';
    if (levelNumber <= 10) return 'Steam Harbor';
    if (levelNumber <= 15) return 'Obsidian Vault';
    return 'Aurora Core';
  }, [levelNumber]);
  const targets = useMemo(() => levelTargets(levelNumber), [levelNumber]);

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
    const fresh = generatePipeGrid(seed, cfg);
    const progress = await getPuzzleProgress(`level-${levelNo}`);
    const resumed = progress?.puzzleType === 'pipe-grid-level' ? applyProgress(fresh, progress.state as PipeGridProgressState) : fresh;

    setBoard(resumed);
    setMoves(progress?.moves ?? 0);
    setHintsUsed(progress?.hintsUsed ?? 0);
    setPhase(progress ? 'playing' : 'briefing');

    const run = runs[levelNo];
    setBest(run ? { score: computeDailyScore(run.moves + levelNo * 2, 0), moves: run.moves } : null);
  }, [runs]);

  useEffect(() => {
    refreshRuns();
    getOrCreatePlayerProfile().then((profile) => {
      if (profile?.name) setPlayerName(profile.name);
    });
  }, [refreshRuns]);

  useEffect(() => {
    load(levelNumber);
  }, [levelNumber, load]);

  async function handleSlide(from: { row: number; col: number }) {
    if (!board || phase !== 'playing' || !canSlide(board, from)) return;
    const next = slideTile(board, from);
    const nextMoves = moves + 1;
    setBoard(next);
    setMoves(nextMoves);
    pulseFeedback(12);

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
        synced: false,
        playerName
      });

      await clearPuzzleProgress(`level-${levelNumber}`);

      if (session && navigator.onLine) {
        await syncAllPending({ online: navigator.onLine, signedIn: Boolean(session) }).catch(() => undefined);
      }

      await refreshRuns();
      setPhase('cleared');
      pulseFeedback([18, 45, 18]);
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

  function startLevel() {
    setPhase('playing');
  }

  async function nextStage() {
    const target = Math.min(Math.max(unlockedLevel, levelNumber + 1), 20);
    setLevelNumber(target);
    await load(target);
  }

  async function restartLevel() {
    await clearPuzzleProgress(`level-${levelNumber}`);
    await load(levelNumber);
  }

  if (!board) return <main className="page-shell game-page">Loading level…</main>;

  const roadmap = [
    { id: 1, label: 'Briefing', done: phase !== 'briefing' },
    { id: 2, label: 'Solve board', done: phase === 'cleared' },
    { id: 3, label: 'Promote level', done: Boolean(runs[levelNumber]) }
  ];

  return (
    <main className="page-shell game-page">
      <section className="panel game-brief-card">
        <h1 style={{ marginTop: 0 }}>Campaign Level {levelNumber}</h1>
        <p className="muted">{chapter} • Difficulty {levelConfig(levelNumber).difficulty} • Pilot: <strong>{playerName}</strong></p>
        <p className="muted">{chapter} • Difficulty {levelConfig(levelNumber).difficulty} • Target: clean tunnel routing.</p>


        <div className="flow-row">
          {roadmap.map((step) => (
            <div key={step.id} className={`flow-step ${step.done ? 'done' : ''}`}>
              <strong>{step.id}</strong>
              <span>{step.label}</span>
            </div>
          ))}
        </div>

        <div className="hud-grid">
          <div><small>Moves</small><strong>{moves}</strong></div>
          <div><small>Hints</small><strong>{HINT_LIMIT - hintsUsed}</strong></div>
          <div><small>Best</small><strong>{best ? `${best.moves} moves` : '—'}</strong></div>
          <div><small>Unlocked</small><strong>{unlockedLevel}</strong></div>
        </div>

        <div className="target-strip">
          <span>🥇 ≤ {targets.goldMaxMoves}</span>
          <span>🥈 ≤ {targets.silverMaxMoves}</span>
          <span>🥉 ≤ {targets.bronzeMaxMoves}</span>
        </div>

        {phase === 'briefing' && <button className="wood-btn" onClick={startLevel}>Start Level</button>}
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
      </section>

      <PipeGridBoard level={board} onSlide={handleSlide} />

      <div className="action-row">
        <button className="ghost-btn" onClick={() => setLevelNumber((v) => Math.max(1, v - 1))}>Prev</button>
        <button className="ghost-btn" onClick={() => setLevelNumber((v) => Math.min(unlockedLevel, v + 1))}>Next</button>
        <button className="wood-btn" onClick={() => setHintsUsed((v) => Math.min(HINT_LIMIT, v + 1))} disabled={hintsUsed >= HINT_LIMIT || phase !== 'playing'}>Use Hint</button>
        <button className="ghost-btn" onClick={restartLevel}>Restart</button>
      </div>

      {phase === 'briefing' && (
        <div className="modal-overlay">
          <div className="panel modal-card">
            <h2 style={{ marginTop: 0 }}>Level Briefing</h2>
            <p>Each level increases scramble complexity and lock density. Plan moves 2-3 steps ahead like Roll-the-Ball progression.</p>
            <button className="wood-btn" onClick={startLevel}>Launch Level</button>
          </div>
        </div>
      )}

      {phase === 'cleared' && (
        <div className="modal-overlay">
          <div className="panel modal-card">
            <h2 style={{ marginTop: 0 }}>Level Cleared</h2>
            <p>Great routing! Your best run was saved.</p>
            <div className="action-row">
              <button className="wood-btn" onClick={nextStage}>Next Stage</button>
              <button className="ghost-btn" onClick={restartLevel}>Replay</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}
