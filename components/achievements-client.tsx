'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { calculateBestStreak, calculateStreak } from '@/lib/core/streak';
import { getAllDailyActivity, getAllLevelRuns } from '@/lib/storage/db';

// ─── Achievement definitions ───────────────────────────────
type AchievementDef = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  check: (stats: UserStats) => boolean;
  progress: (stats: UserStats) => { current: number; total: number };
};

type UserStats = {
  streak: number;
  bestStreak: number;
  totalDailySolves: number;
  totalLevelSolves: number;
  goldMedals: number;
  copperCleared: boolean;
  quickSolves: number;
};

const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'streak_3',
    name: '3 Day Streak',
    desc: 'Solve 3 consecutive daily puzzles.',
    icon: '🔥',
    check: (s) => s.bestStreak >= 3,
    progress: (s) => ({ current: Math.min(3, s.bestStreak), total: 3 })
  },
  {
    id: 'streak_7',
    name: 'Daily Master',
    desc: 'Solve the Daily Mission for 7 consecutive days.',
    icon: '📅',
    check: (s) => s.bestStreak >= 7,
    progress: (s) => ({ current: Math.min(7, s.bestStreak), total: 7 })
  },
  {
    id: 'streak_10',
    name: '10 Day Streak',
    desc: 'Completed 10 consecutive days of puzzles.',
    icon: '🌟',
    check: (s) => s.bestStreak >= 10,
    progress: (s) => ({ current: Math.min(10, s.bestStreak), total: 10 })
  },
  {
    id: 'streak_30',
    name: 'Unstoppable',
    desc: 'Maintain a 30-day puzzle streak.',
    icon: '⚡',
    check: (s) => s.bestStreak >= 30,
    progress: (s) => ({ current: Math.min(30, s.bestStreak), total: 30 })
  },
  {
    id: 'copper_hero',
    name: 'Copper District Hero',
    desc: 'Completed all levels in the Copper District.',
    icon: '🔧',
    check: (s) => s.copperCleared,
    progress: (s) => ({ current: s.copperCleared ? 5 : Math.min(4, s.totalLevelSolves), total: 5 })
  },
  {
    id: 'levels_10',
    name: 'Pipeline Rookie',
    desc: 'Clear 10 campaign levels.',
    icon: '🗺️',
    check: (s) => s.totalLevelSolves >= 10,
    progress: (s) => ({ current: Math.min(10, s.totalLevelSolves), total: 10 })
  },
  {
    id: 'levels_50',
    name: '50 Levels Cleared',
    desc: 'Cleared 50 unique campaign levels.',
    icon: '🏆',
    check: (s) => s.totalLevelSolves >= 50,
    progress: (s) => ({ current: Math.min(50, s.totalLevelSolves), total: 50 })
  },
  {
    id: 'levels_100',
    name: '100 Levels Cleared',
    desc: 'An elite engineer — cleared all 100 levels.',
    icon: '👑',
    check: (s) => s.totalLevelSolves >= 100,
    progress: (s) => ({ current: Math.min(100, s.totalLevelSolves), total: 100 })
  },
  {
    id: 'gold_5',
    name: 'Gold Starter',
    desc: 'Earn gold medals on 5 levels.',
    icon: '🥇',
    check: (s) => s.goldMedals >= 5,
    progress: (s) => ({ current: Math.min(5, s.goldMedals), total: 5 })
  },
  {
    id: 'gold_50',
    name: 'Master Strategist',
    desc: 'Earn gold medals on 50 levels.',
    icon: '🎯',
    check: (s) => s.goldMedals >= 50,
    progress: (s) => ({ current: Math.min(50, s.goldMedals), total: 50 })
  },
  {
    id: 'daily_20',
    name: 'Daily Devotee',
    desc: 'Solve 20 daily puzzles (non-consecutive).',
    icon: '🧩',
    check: (s) => s.totalDailySolves >= 20,
    progress: (s) => ({ current: Math.min(20, s.totalDailySolves), total: 20 })
  },
  {
    id: 'speed_25',
    name: 'Speed Runner',
    desc: 'Solve 25 daily puzzles in under 60 seconds.',
    icon: '⏱️',
    check: (s) => s.quickSolves >= 25,
    progress: (s) => ({ current: Math.min(25, s.quickSolves), total: 25 })
  }
];

export function AchievementsClient() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [serverEarned, setServerEarned] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const [activity, runs] = await Promise.all([
        getAllDailyActivity(),
        getAllLevelRuns()
      ]);

      const solved   = activity.filter((a) => a.solved);
      const map      = Object.fromEntries(activity.map((a) => [a.date, { solved: a.solved }]));
      const bestStr  = calculateBestStreak(map);
      const curStr   = calculateStreak(map);
      const levelMap: Record<number, number> = {};
      for (const r of runs) {
        if (!levelMap[r.level] || r.stars > levelMap[r.level]) levelMap[r.level] = r.stars;
      }
      const goldMedals   = Object.values(levelMap).filter((s) => s === 3).length;
      const copperCleared = [1,2,3,4,5].every((l) => levelMap[l] !== undefined);
      const quickSolves  = solved.filter((a) => (a.timeTaken ?? 999) < 60).length;
      const uniqueLevels = Object.keys(levelMap).length;

      setStats({
        streak: curStr,
        bestStreak: bestStr,
        totalDailySolves: solved.length,
        totalLevelSolves: uniqueLevels,
        goldMedals,
        copperCleared,
        quickSolves
      });
    }
    load();
  }, []);

  // Fetch server-stored earned achievements
  useEffect(() => {
    if (!session) return;
    fetch('/api/achievements')
      .then((r) => r.json())
      .then((data) => {
        const ids = (data.earned ?? []).map((e: { id: string }) => e.id);
        setServerEarned(new Set(ids));
      })
      .catch(() => {});
  }, [session]);

  // Sync newly earned achievements to server
  useEffect(() => {
    if (!stats || !session || typeof navigator === 'undefined' || !navigator.onLine) return;
    const newlyEarned = ACHIEVEMENTS
      .filter((a) => a.check(stats) && !serverEarned.has(a.id))
      .map((a) => a.id);
    if (newlyEarned.length === 0) return;
    fetch('/api/achievements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: newlyEarned })
    }).catch(() => {});
  }, [stats, session, serverEarned]);

  if (!stats) {
    return (
      <main className="page-shell">
        <p className="muted">Loading achievements…</p>
      </main>
    );
  }

  const earned   = ACHIEVEMENTS.filter((a) => a.check(stats));
  const pending  = ACHIEVEMENTS.filter((a) => !a.check(stats));

  return (
    <main className="page-shell">
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="label-chip" style={{ marginBottom: 8 }}>Your Progress</div>
        <h1 style={{ marginBottom: 4 }}>Achievements &amp; Badges</h1>
        <p className="muted" style={{ marginBottom: 0 }}>
          {earned.length} / {ACHIEVEMENTS.length} badges earned
        </p>
        <div className="progress-bar-wrap" style={{ marginTop: 8 }}>
          <div className="progress-bar-fill"
            style={{ width: `${(earned.length / ACHIEVEMENTS.length) * 100}%` }} />
        </div>
        <div className="action-row">
          <Link href="/home" className="ghost-btn">← Back to HQ</Link>
        </div>
      </section>

      {/* Earned badges */}
      {earned.length > 0 && (
        <section className="achievements-section">
          <h2>Earned Badges ✓</h2>
          <div className="badges-grid">
            {earned.map((a) => (
              <div key={a.id} className="badge-card earned">
                <div className="badge-icon">{a.icon}</div>
                <div className="badge-info">
                  <h3>{a.name}</h3>
                  <p>{a.desc}</p>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: '100%' }} />
                  </div>
                </div>
                <span className="badge-earned-mark">✅</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending achievements */}
      {pending.length > 0 && (
        <section className="achievements-section">
          <h2>Pending Achievements</h2>
          <div className="pending-badges-grid">
            {pending.map((a) => {
              const { current, total } = a.progress(stats);
              const pct = Math.round((current / total) * 100);
              return (
                <div key={a.id} className="pending-badge-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: '1.5rem' }}>{a.icon}</span>
                    <h3 style={{ margin: 0 }}>{a.name} — {current}/{total}</h3>
                  </div>
                  <p>{a.desc}</p>
                  <div className="pending-progress-label">
                    <span>Progress</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {earned.length === 0 && (
        <div className="empty-state">
          <p>No badges yet — start playing to earn your first achievement!</p>
          <Link href="/play" className="wood-btn">Play Today&apos;s Puzzle</Link>
        </div>
      )}
    </main>
  );
}
