'use client';

import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { TheGridLogo } from '@/components/the-grid-logo';
import { formatDateKey } from '@/lib/core/date';
import { calculateBestStreak, calculateStreak } from '@/lib/core/streak';
import { getAllDailyActivity, getAllLevelRuns } from '@/lib/storage/db';

export function HomeClient() {
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [levelRuns, setLevelRuns] = useState(0);
  const [starCount, setStarCount] = useState(0);
  const { data: session } = useSession();
  const today = formatDateKey(new Date());

  useEffect(() => {
    getAllDailyActivity().then((items) => {
      const map = Object.fromEntries(items.map((item) => [item.date, { solved: item.solved }]));
      setStreak(calculateStreak(map));
      setBestStreak(calculateBestStreak(map));
    });

    getAllLevelRuns().then((runs) => {
      setLevelRuns(runs.length);
      setStarCount(runs.reduce((acc, run) => acc + (run.stars ?? 0), 0));
    });
  }, []);

  const nextLevel = useMemo(() => Math.max(1, Math.floor(levelRuns / 2) + 1), [levelRuns]);

  return (
    <main className="page-shell game-page">
      <header className="panel dashboard-header">
        <TheGridLogo size={72} />
        <div>
          <h1 style={{ margin: 0 }}>Commander, welcome back.</h1>
          <p style={{ margin: '4px 0 0', opacity: 0.9 }}>Today&apos;s challenge: {today}</p>
          <div className="action-row" style={{ marginTop: 8 }}>
            {session ? (
              <>
                <span className="muted">Signed in as {session.user?.name ?? session.user?.email ?? 'Player'}</span>
                <button className="ghost-btn" onClick={() => signOut({ callbackUrl: '/auth' })}>Sign out</button>
              </>
            ) : (
              <button className="ghost-btn" onClick={() => signIn(undefined, { callbackUrl: '/auth' })}>Sign in</button>
            )}
          </div>
        </div>
      </header>

      <section className="panel hero-card">
        <h2 style={{ marginTop: 0 }}>Daily Puzzle</h2>
        <p>Slide carved tunnel blocks and connect START to END in the fewest moves.</p>
        <Link href="/play" className="wood-btn">Play Now</Link>
      </section>

      <section className="dashboard-grid">
        <article className="panel stat-card"><h3>🔥 Current Streak</h3><p>{streak} days</p></article>
        <article className="panel stat-card"><h3>🌟 Best Streak</h3><p>{bestStreak} days</p></article>
        <article className="panel stat-card"><h3>🧱 Level Mode</h3><p>Next level: {nextLevel}</p><Link href="/levels" className="ghost-btn">Open Levels</Link></article>
        <article className="panel stat-card"><h3>🎁 Rewards</h3><p>{starCount} stars collected</p><div className="progress-track"><span style={{ width: `${Math.min(100, starCount * 4)}%` }} /></div></article>
      </section>

      <BottomNav />
    </main>
  );
}
