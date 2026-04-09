'use client';

import Link from 'next/link';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { TheGridLogo } from '@/components/the-grid-logo';
import { formatDateKey } from '@/lib/core/date';
import { calculateBestStreak, calculateStreak } from '@/lib/core/streak';
import { getAllDailyActivity, getAllLevelRuns, getOrCreatePlayerProfile, upsertPlayerProfile } from '@/lib/storage/db';

export function HomeClient() {
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [levelRuns, setLevelRuns] = useState(0);
  const [starCount, setStarCount] = useState(0);
  const { data: session } = useSession();
  const [today, setToday] = useState('');
  const [callsign, setCallsign] = useState('');
  const [savingCallsign, setSavingCallsign] = useState(false);

  useEffect(() => {
    setToday(formatDateKey(new Date()));

    getOrCreatePlayerProfile().then((profile) => {
      if (profile) setCallsign(profile.name);
    });

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


  async function saveCallsign() {
    setSavingCallsign(true);
    const profile = await upsertPlayerProfile(callsign);
    if (profile) setCallsign(profile.name);
    setSavingCallsign(false);
  }

  const nextLevel = useMemo(() => Math.max(1, Math.floor(levelRuns / 2) + 1), [levelRuns]);

  return (
    <main className="page-shell game-page">
      <header className="panel dashboard-header">
        <TheGridLogo size={72} />
        <div>
          <h1 style={{ margin: 0 }}>Command Center</h1>
          <p style={{ margin: '4px 0 0', opacity: 0.9 }}>Daily mission board: {today}</p>
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
          <div className="action-row" style={{ marginTop: 6 }}>
            <input
              className="game-input callsign-input"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              placeholder="Set your callsign"
              maxLength={24}
            />
            <button className="ghost-btn" onClick={saveCallsign} disabled={savingCallsign}>
              {savingCallsign ? 'Saving…' : 'Save Callsign'}
            </button>
          </div>
        </div>
      </header>

      <section className="panel hero-card">
        <h2 style={{ marginTop: 0 }}>Game Workflow</h2>
        <div className="cover-flow">
          <article><strong>Mission</strong><span>Choose Daily or Campaign level.</span></article>
          <article><strong>Play</strong><span>Slide pieces to create a full tunnel.</span></article>
          <article><strong>Progress</strong><span>Stars unlock harder levels.</span></article>
        </div>
        <div className="action-row">
          <Link href="/play" className="wood-btn">Play Daily</Link>
          <Link href="/levels" className="ghost-btn">Open Campaign</Link>
        </div>
      </section>


      <section className="panel hero-card">
        <h2 style={{ marginTop: 0 }}>Play Modes</h2>
        <div className="mode-grid">
          <article>
            <strong>Daily Mission</strong>
            <span>One handcrafted puzzle every day with streak rewards.</span>
            <Link href="/play" className="ghost-btn">Play Daily</Link>
          </article>
          <article>
            <strong>Campaign Route</strong>
            <span>Progressive stages inspired by board-game journey maps.</span>
            <Link href="/levels" className="ghost-btn">Continue Campaign</Link>
          </article>
          <article>
            <strong>Arena Ranking</strong>
            <span>Compare your tactical speed and stars with global players.</span>
            <Link href="/leaderboard" className="ghost-btn">Open Arena</Link>
          </article>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel stat-card"><h3>🔥 Current Streak</h3><p>{streak} days</p></article>
        <article className="panel stat-card"><h3>🌟 Best Streak</h3><p>{bestStreak} days</p></article>
        <article className="panel stat-card"><h3>🧱 Campaign</h3><p>Next level: {nextLevel}</p><Link href="/levels" className="ghost-btn">Continue</Link></article>
        <article className="panel stat-card"><h3>🎁 Rewards</h3><p>{starCount} stars collected</p><div className="progress-track"><span style={{ width: `${Math.min(100, starCount * 4)}%` }} /></div></article>
      </section>

      <BottomNav />
    </main>
  );
}
