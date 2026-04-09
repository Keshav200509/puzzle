'use client';

import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { formatDateKey } from '@/lib/core/date';
import { calculateBestStreak, calculateStreak } from '@/lib/core/streak';
import { getAllDailyActivity, getAllLevelRuns } from '@/lib/storage/db';

type ServerStats = {
  totalDailySolves: number;
  totalLevelSolves: number;
  totalStars: number;
  bestDailyScore: number;
  dailyDates: string[];
};

export function HomeClient() {
  const [streak, setStreak]             = useState(0);
  const [bestStreak, setBestStreak]     = useState(0);
  const [totalSolves, setTotalSolves]   = useState(0);
  const [levelRuns, setLevelRuns]       = useState(0);
  const [starCount, setStarCount]       = useState(0);
  const [todaySolved, setTodaySolved]   = useState(false);
  const [serverStats, setServerStats]   = useState<ServerStats | null>(null);
  const [syncedFromServer, setSynced]   = useState(false);
  const { data: session }               = useSession();
  const [today, setToday]               = useState('');
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalSolves, setTotalSolves] = useState(0);
  const [levelRuns, setLevelRuns] = useState(0);
  const [starCount, setStarCount] = useState(0);
  const [todaySolved, setTodaySolved] = useState(false);
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [syncedFromServer, setSyncedFromServer] = useState(false);
  const { data: session } = useSession();
  const [today, setToday] = useState('');
  // Load local stats from IndexedDB
  useEffect(() => {
    const todayKey = formatDateKey(new Date());
    setToday(todayKey);

    getAllDailyActivity().then((items) => {
      const map = Object.fromEntries(items.map((i) => [i.date, { solved: i.solved }]));
      setStreak(calculateStreak(map));
      setBestStreak(calculateBestStreak(map));
      setTotalSolves(items.filter((i) => i.solved).length);
      setTodaySolved(Boolean(map[todayKey]?.solved));
    });

    getAllLevelRuns().then((runs) => {
      setLevelRuns(runs.length);
      setStarCount(runs.reduce((acc, r) => acc + (r.stars ?? 0), 0));
    });
  }, []);
  useEffect(() => {
    if (!session || typeof navigator === 'undefined' || !navigator.onLine) return;
  // Fetch server stats when signed in and online
  useEffect(() => {
    if (!session || typeof navigator === 'undefined' || !navigator.onLine) return;

    fetch('/api/user/stats')
      .then(async (res) => {
        if (!res.ok) return;
        const data: ServerStats = await res.json();
        setServerStats(data);
        setSynced(true);
        if (data.totalDailySolves > 0 || data.totalStars > 0) {
          setTotalSolves((l) => Math.max(l, data.totalDailySolves));
          setStarCount((l) => Math.max(l, data.totalStars));
        setSyncedFromServer(true);

        // Prefer server totals (authoritative across all devices)
        if (data.totalDailySolves > 0 || data.totalLevelSolves > 0) {
          setTotalSolves((local) => Math.max(local, data.totalDailySolves));
          setStarCount((local) => Math.max(local, data.totalStars));

          // Rebuild streak from server dates if more history available
          if (data.dailyDates.length > 0) {
            const todayKey = formatDateKey(new Date());
            const map = Object.fromEntries(data.dailyDates.map((d) => [d, { solved: true }]));
            setStreak(calculateStreak(map));
            setBestStreak(calculateBestStreak(map));
            setTodaySolved(Boolean(map[todayKey]));
          }
        }
      })
      .catch(() => {});
  }, [session]);

  const nextLevel = useMemo(() => {
    const completed = serverStats?.totalLevelSolves ?? levelRuns;
    return Math.max(1, Math.min(50, completed + 1));
  }, [serverStats, levelRuns]);

  const starProgress = Math.min(100, starCount * 2);
      .catch(() => {/* offline or DB not configured – silent */});
  }, [session]);

  const nextLevel = useMemo(() => {
    const completedCount = serverStats?.totalLevelSolves ?? levelRuns;
    return Math.max(1, Math.min(50, completedCount + 1));
  }, [serverStats, levelRuns]);

  return (
    <main className="page-shell game-page">

      {/* ── Hero streak ── */}
      <section className="panel streak-hero" style={{ marginBottom: 12 }}>      {/* ── Streak hero ── */}
      {/* ── Streak hero (primary motivation, LinkedIn-style) ── */}
      <section className="panel streak-hero" style={{ marginBottom: 10 }}>
        <span className="streak-number">{streak}</span>
        <span className="streak-label">🔥 Day streak</span>
        {streak === 0 && (
          <p className="muted" style={{ marginTop: 8, fontSize: '0.82rem' }}>
            Play today&apos;s puzzle to ignite your streak!
          </p>
        )}
        {streak > 0 && bestStreak > streak && (
          <p className="muted" style={{ marginTop: 6, fontSize: '0.78rem' }}>
            Personal best: {bestStreak} days
          </p>
        )}
        {syncedFromServer && (
          <p style={{ marginTop: 6, fontSize: '0.7rem', color: 'var(--accent)', opacity: 0.8 }}>
            ☁ Synced from account
          </p>
        )}
        {syncedFromServer && (
          <p className="muted" style={{ marginTop: 4, fontSize: '0.72rem', opacity: 0.7 }}>
            ☁ Synced from account
          </p>
        )}
      </section>

      {/* ── Today's puzzle CTA ── */}
      <div className="daily-cta" style={{ marginBottom: 12 }}>
        <div className="label-chip" style={{ marginBottom: 8 }}>
          {todaySolved ? 'Completed ✓' : 'Daily Challenge'}
        </div>
        <h2 style={{ marginBottom: 4 }}>
          {todaySolved ? '✅ Puzzle Solved!' : "Today's Puzzle"}
        </h2>
        <span className="daily-date">{today}</span>
        {todaySolved ? (
          <div className="action-row" style={{ justifyContent: 'center', marginTop: 10 }}>
            <Link href="/stats" className="wood-btn">My Stats</Link>
          <div className="action-row" style={{ justifyContent: 'center' }}>
            <Link href="/stats" className="wood-btn">View Stats</Link>
            <Link href="/stats" className="wood-btn">View My Stats</Link>
            <Link href="/play" className="ghost-btn">Replay</Link>
          </div>
        ) : (
          <Link href="/play" className="wood-btn"
            style={{ display: 'inline-block', marginTop: 10 }}>
            Play Now →
          </Link>
        )}
      </div>

      {/* ── KPI row ── */}
      {/* ── Quick KPI stats ── */}
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
          <span className="kpi-label">Stars ⭐</span>
        </div>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{bestStreak}</span>
          <span className="kpi-label">Best streak</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{starCount}</span>
          <span className="kpi-label">Stars ⭐</span>
        </div>
      </div>

      {/* ── Game modes ── */}
      <section className="panel" style={{ marginBottom: 12 }}>
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Play Modes</h2>
        <div className="mode-grid">
          <Link href="/play" style={{ textDecoration: 'none' }}>
            <article style={{ cursor: 'pointer' }}>
              <span className="mode-icon">🌟</span>
              <div>
                <strong>Daily Puzzle</strong>
                <span>One new puzzle every day. Compete globally.</span>
              </div>
            </article>
          </Link>
          <Link href="/levels" style={{ textDecoration: 'none' }}>
            <article style={{ cursor: 'pointer' }}>
              <span className="mode-icon">🗺️</span>
              <div>
                <strong>Campaign</strong>
                <span>50 levels across 7 chapters — from Copper to Apex.</span>
              </div>
            </article>
          </Link>
          <Link href="/studio" style={{ textDecoration: 'none' }}>
            <article style={{ cursor: 'pointer' }}>
              <span className="mode-icon">🎨</span>
              <div>
                <strong>Creative Studio</strong>
                <span>Build and share your own pipe puzzles.</span>
              </div>
            </article>
          </Link>
          <Link href="/achievements" style={{ textDecoration: 'none' }}>
            <article style={{ cursor: 'pointer' }}>
              <span className="mode-icon">🎖️</span>
              <div>
                <strong>Achievements</strong>
                <span>Earn badges and track your milestones.</span>
              </div>
            </article>
          </Link>
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
              <span>50 levels across 7 chapters — from Copper to Apex.</span>
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
        <div className="action-row" style={{ marginTop: 14 }}>
          <Link href="/play" className="wood-btn">Daily Puzzle</Link>
          <Link href="/levels" className="ghost-btn">Campaign (Lvl {nextLevel})</Link>
          <Link href="/leaderboard" className="ghost-btn">Leaders</Link>
        </div>
      </section>

      {/* ── Account ── */}
      <section className="panel" style={{ marginBottom: 10, fontSize: '0.875rem' }}>
        {session ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span className="muted">
                Signed in as{' '}
                <strong style={{ color: 'var(--text)' }}>
                  {session.user?.name ?? session.user?.email}
                </strong>
              </span>
              <button
                className="ghost-btn"
                onClick={() => signOut({ callbackUrl: '/auth' })}
                style={{ minHeight: 36, padding: '0 14px', fontSize: '0.82rem' }}
              >
                <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span className="muted">
                Signed in as <strong style={{ color: 'var(--text)' }}>{session.user?.name ?? session.user?.email}</strong>
              </span>
              <button className="ghost-btn" onClick={() => signOut({ callbackUrl: '/auth' })} style={{ minHeight: 36, padding: '0 14px', fontSize: '0.82rem' }}>
                Sign out
              </button>
            </div>
            {serverStats && (
              <div className="kpi-row" style={{ marginTop: 12 }}>
                <div className="kpi-card">
                  <span className="kpi-value">{serverStats.totalDailySolves}</span>
                  <span className="kpi-label">Daily synced</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-value">{serverStats.totalLevelSolves}</span>
                  <span className="kpi-label">Levels synced</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-value">{serverStats.bestDailyScore}</span>
                  <span className="kpi-label">Best score</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span className="muted">Sign in to sync across devices and join global rankings.</span>
            <button
              className="ghost-btn"
              onClick={() => signIn(undefined, { callbackUrl: '/auth' })}
              style={{ minHeight: 36, padding: '0 14px', fontSize: '0.82rem' }}
            >
              Sign in
            </button>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span className="muted">Sign in to sync progress across devices and join global rankings.</span>
            <button className="ghost-btn" onClick={() => signIn(undefined, { callbackUrl: '/auth' })} style={{ minHeight: 36, padding: '0 14px', fontSize: '0.82rem' }}>
              Sign in
            </button>
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
          <span style={{ width: `${starProgress}%` }} />
        </div>
        <p className="muted" style={{ marginTop: 4, fontSize: '0.7rem' }}>
          {starCount} stars collected — keep playing to fill the bar!
        </p>
      </section>

    </main>
  );
}
