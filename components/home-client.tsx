'use client';

import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { formatDateKey } from '@/lib/core/date';
import { calculateBestStreak, calculateStreak } from '@/lib/core/streak';
import { getAllDailyActivity, getAllLevelRuns } from '@/lib/storage/db';

export function HomeClient() {
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalSolves, setTotalSolves] = useState(0);
  const [levelRuns, setLevelRuns] = useState(0);
  const [starCount, setStarCount] = useState(0);
  const [todaySolved, setTodaySolved] = useState(false);
  const { data: session } = useSession();
  const [today, setToday] = useState('');

  useEffect(() => {
    const todayKey = formatDateKey(new Date());
    setToday(todayKey);

    getAllDailyActivity().then((items) => {
      const map = Object.fromEntries(items.map((item) => [item.date, { solved: item.solved }]));
      setStreak(calculateStreak(map));
      setBestStreak(calculateBestStreak(map));
      setTotalSolves(items.filter((i) => i.solved).length);
      setTodaySolved(Boolean(map[todayKey]?.solved));
    });

    getAllLevelRuns().then((runs) => {
      setLevelRuns(runs.length);
      setStarCount(runs.reduce((acc, run) => acc + (run.stars ?? 0), 0));
    });
  }, []);

  const nextLevel = useMemo(() => Math.max(1, Math.floor(levelRuns / 2) + 1), [levelRuns]);

  return (
    <main className="page-shell game-page">

      {/* ── Streak hero (primary motivation, LinkedIn-style) ── */}
      <section className="panel streak-hero" style={{ marginBottom: 10 }}>
        <span className="streak-number">{streak}</span>
        <span className="streak-label">🔥 Day streak</span>
        {streak === 0 && (
          <p className="muted" style={{ marginTop: 8, fontSize: '0.82rem' }}>
            Play today to start your streak!
          </p>
        )}
        {streak > 0 && bestStreak > streak && (
          <p className="muted" style={{ marginTop: 6, fontSize: '0.78rem' }}>
            Best: {bestStreak} days
          </p>
        )}
      </section>

      {/* ── Today's puzzle CTA ── */}
      <div className="daily-cta">
        <h2 style={{ marginBottom: 4 }}>
          {todaySolved ? '✅ Completed!' : "Today's Puzzle"}
        </h2>
        <span className="daily-date">{today}</span>
        {todaySolved ? (
          <div className="action-row" style={{ justifyContent: 'center' }}>
            <Link href="/stats" className="wood-btn">View My Stats</Link>
            <Link href="/play" className="ghost-btn">Replay</Link>
          </div>
        ) : (
          <Link href="/play" className="wood-btn" style={{ display: 'inline-block', marginTop: 0 }}>
            Play Now →
          </Link>
        )}
      </div>

      {/* ── Quick stats ── */}
      <div className="kpi-row" style={{ marginBottom: 12 }}>
        <div className="kpi-card">
          <span className="kpi-value">{totalSolves}</span>
          <span className="kpi-label">Solved</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{bestStreak}</span>
          <span className="kpi-label">Best streak</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{starCount}</span>
          <span className="kpi-label">Stars</span>
        </div>
      </div>

      {/* ── Game modes ── */}
      <section className="panel" style={{ marginBottom: 10 }}>
        <h2 style={{ marginTop: 0 }}>Play Modes</h2>
        <div className="mode-grid">
          <article>
            <span className="mode-icon">🧩</span>
            <div>
              <strong>Daily Puzzle</strong>
              <span>One new puzzle every day. Compete globally.</span>
            </div>
          </article>
          <article>
            <span className="mode-icon">🗺️</span>
            <div>
              <strong>Campaign</strong>
              <span>Progressive levels that get harder as you advance.</span>
            </div>
          </article>
          <article>
            <span className="mode-icon">🏆</span>
            <div>
              <strong>Leaderboard</strong>
              <span>See how your scores stack up globally.</span>
            </div>
          </article>
        </div>
        <div className="action-row" style={{ marginTop: 12 }}>
          <Link href="/play" className="wood-btn">Daily Puzzle</Link>
          <Link href="/levels" className="ghost-btn">Campaign (Lvl {nextLevel})</Link>
          <Link href="/leaderboard" className="ghost-btn">Leaderboard</Link>
        </div>
      </section>

      {/* ── Account ── */}
      <section className="panel" style={{ marginBottom: 10, fontSize: '0.875rem' }}>
        {session ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span className="muted">Signed in as <strong style={{ color: 'var(--text)' }}>{session.user?.name ?? session.user?.email}</strong></span>
            <button className="ghost-btn" onClick={() => signOut({ callbackUrl: '/auth' })} style={{ minHeight: 36, padding: '0 14px', fontSize: '0.82rem' }}>Sign out</button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span className="muted">Sign in to sync your progress and join global rankings.</span>
            <button className="ghost-btn" onClick={() => signIn(undefined, { callbackUrl: '/auth' })} style={{ minHeight: 36, padding: '0 14px', fontSize: '0.82rem' }}>Sign in</button>
          </div>
        )}
        <div className="progress-track" style={{ marginTop: 12 }}>
          <span style={{ width: `${Math.min(100, starCount * 3)}%` }} />
        </div>
        <p className="muted" style={{ marginTop: 4, fontSize: '0.72rem' }}>{starCount} stars collected</p>
      </section>

      <BottomNav />
    </main>
  );
}
