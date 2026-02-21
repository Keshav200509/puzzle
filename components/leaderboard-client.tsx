'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { BottomNav } from '@/components/bottom-nav';
import { formatDateKey } from '@/lib/core/date';
import type { DailyActivityRecord } from '@/lib/storage/db';
import { getAllDailyActivity } from '@/lib/storage/db';

type SortMode = 'moves' | 'score';
type ScopeMode = 'daily' | 'levels';
type BoardTab = 'local' | 'global';

type Leader = { rank: number; name: string; moves: number; score: number; stars: number };

export function LeaderboardClient() {
  const [entries, setEntries] = useState<DailyActivityRecord[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('moves');
  const [scope, setScope] = useState<ScopeMode>('daily');
  const [tab, setTab] = useState<BoardTab>('local');
  const [globalLeaders, setGlobalLeaders] = useState<Leader[]>([]);
  const [online, setOnline] = useState(true);
  const [dbConfigured, setDbConfigured] = useState(false);
  const [globalMessage, setGlobalMessage] = useState('');
  const { data: session } = useSession();

  useEffect(() => {
    setOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  useEffect(() => {
    getAllDailyActivity().then((items) => setEntries(items.filter((item) => item.solved)));
  }, []);

  useEffect(() => {
    if (!session || !online) {
      setDbConfigured(false);
      return;
    }

    fetch('/api/health/db')
      .then(async (res) => {
        const data = await res.json();
        setDbConfigured(Boolean(data.configured && data.connected));
      })
      .catch(() => setDbConfigured(false));
  }, [session, online]);

  useEffect(() => {
    if (tab !== 'global') return;
    if (!session) {
      setGlobalMessage('Sign in to view global leaderboard.');
      return;
    }
    if (!online) {
      setGlobalMessage('Offline mode: global leaderboard unavailable.');
      return;
    }
    if (!dbConfigured) {
      setGlobalMessage('Database not configured.');
      return;
    }

    const endpoint =
      scope === 'daily'
        ? `/api/leaderboard/daily?date=${formatDateKey(new Date())}`
        : `/api/leaderboard/levels?level=1`;

    fetch(endpoint)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setGlobalMessage(data.error ?? 'Unable to load global leaderboard.');
          setGlobalLeaders([]);
          return;
        }
        setGlobalLeaders(data.leaders ?? []);
        setGlobalMessage('');
      })
      .catch(() => {
        setGlobalLeaders([]);
        setGlobalMessage('Unable to load global leaderboard.');
      });
  }, [dbConfigured, online, scope, session, tab]);

  const ranked = useMemo(() => {
    const cloned = [...entries];
    if (sortMode === 'moves') return cloned.sort((a, b) => a.moves - b.moves || b.score - a.score).slice(0, 30);
    return cloned.sort((a, b) => b.score - a.score || a.moves - b.moves).slice(0, 30);
  }, [entries, sortMode]);

  const showGlobalTab = Boolean(session && online && dbConfigured);

  return (
    <main className="page-shell game-page px-4">
      <section className="panel phone-shell-guard max-w-md mx-auto">
        <h1 style={{ marginTop: 0 }}>Leaderboard</h1>
        <p>Local rankings always work offline.</p>

        <div className="action-row" style={{ marginBottom: 10 }}>
          <button className={`ghost-btn ${tab === 'local' ? 'active' : ''}`} onClick={() => setTab('local')}>Local</button>
          {showGlobalTab && (
            <button className={`ghost-btn ${tab === 'global' ? 'active' : ''}`} onClick={() => setTab('global')}>Global</button>
          )}
          <button className={`ghost-btn ${scope === 'daily' ? 'active' : ''}`} onClick={() => setScope('daily')}>Daily</button>
          <button className={`ghost-btn ${scope === 'levels' ? 'active' : ''}`} onClick={() => setScope('levels')}>Levels</button>
          <button className={`ghost-btn ${sortMode === 'moves' ? 'active' : ''}`} onClick={() => setSortMode('moves')}>Lowest Moves</button>
          <button className={`ghost-btn ${sortMode === 'score' ? 'active' : ''}`} onClick={() => setSortMode('score')}>Highest Score</button>
        </div>

        {tab === 'local' && (
          <>
            <h3>Local</h3>
            {ranked.length === 0 ? (
              <div className="empty-state">
                <p>🧩 No solved runs yet.</p>
                <Link href="/play" className="wood-btn">Play Daily Puzzle</Link>
              </div>
            ) : (
              <div className="list-grid compact-list">
                {ranked.map((entry, index) => (
                  <div key={`${entry.date}-${index}`} className="list-item leaderboard-row">
                    <strong>{index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}</strong>
                    <span>{entry.date}</span>
                    <span>{entry.moves} moves</span>
                    <span>{entry.score} pts</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'global' && showGlobalTab && (
          <>
            <h3 style={{ marginTop: 14 }}>Global</h3>
            {globalMessage && <p className="muted">{globalMessage}</p>}
            {!globalMessage && globalLeaders.length === 0 ? (
              <p className="muted">No global entries yet.</p>
            ) : (
              <div className="list-grid compact-list">
                {globalLeaders.map((entry) => (
                  <div key={`${entry.rank}-${entry.name}`} className="list-item leaderboard-row">
                    <strong>#{entry.rank}</strong>
                    <span>{entry.name}</span>
                    <span>{entry.moves} moves</span>
                    <span>{entry.score} pts</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {!showGlobalTab && (
          <div>
            {!session && (
              <p className="muted">Sign in to view global leaderboard. <button className="ghost-btn" onClick={() => signIn(undefined, { callbackUrl: '/auth' })}>Sign in</button></p>
            )}
            {session && !online && <p className="muted">Offline mode: global leaderboard unavailable.</p>}
            {session && online && !dbConfigured && <p className="muted">Database not configured.</p>}
          </div>
        )}
      </section>
      <BottomNav />
    </main>
  );
}
