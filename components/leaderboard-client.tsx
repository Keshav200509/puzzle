'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { formatDateKey } from '@/lib/core/date';
import type { DailyActivityRecord } from '@/lib/storage/db';
import { getAllDailyActivity } from '@/lib/storage/db';
import { BottomNav } from '@/components/bottom-nav';

type SortMode = 'moves' | 'score';
type ScopeMode = 'daily' | 'levels';
type BoardTab = 'mine' | 'global';

type Leader = { rank: number; name: string; moves: number; score: number; stars: number };

export function LeaderboardClient() {
  const [entries, setEntries] = useState<DailyActivityRecord[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('moves');
  const [scope, setScope] = useState<ScopeMode>('daily');
  const [tab, setTab] = useState<BoardTab>('mine');
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
      setGlobalMessage('You\'re offline — global leaderboard unavailable.');
      return;
    }
    if (!dbConfigured) {
      setGlobalMessage('Global leaderboard is not yet configured for this deployment.');
      return;
    }

    const endpoint =
      scope === 'daily'
        ? `/api/leaderboard/daily?date=${formatDateKey(new Date())}`
        : `/api/leaderboard/levels?level=1`;

    setGlobalMessage('Loading…');
    fetch(endpoint)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setGlobalMessage(data.error ?? 'Unable to load global leaderboard.');
          setGlobalLeaders([]);
          return;
        }
        setGlobalLeaders(data.leaders ?? []);
        setGlobalMessage(data.leaders?.length === 0 ? 'No entries yet — be the first!' : '');
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

  const canShowGlobal = Boolean(session && online);

  return (
    <main className="page-shell game-page">
      <section className="panel">
        <h1 style={{ marginTop: 0 }}>Leaderboard</h1>

        {/* Tab row */}
        <div className="action-row" style={{ marginBottom: 4, flexWrap: 'wrap' }}>
          <button className={`ghost-btn${tab === 'mine' ? ' active' : ''}`} onClick={() => setTab('mine')}>
            My History
          </button>
          <button
            className={`ghost-btn${tab === 'global' ? ' active' : ''}`}
            onClick={() => setTab('global')}
          >
            Global 🌍
          </button>
        </div>

        {/* Filters */}
        <div className="action-row" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
          <button className={`ghost-btn${scope === 'daily' ? ' active' : ''}`} onClick={() => setScope('daily')}>Daily</button>
          <button className={`ghost-btn${scope === 'levels' ? ' active' : ''}`} onClick={() => setScope('levels')}>Levels</button>
          <button className={`ghost-btn${sortMode === 'moves' ? ' active' : ''}`} onClick={() => setSortMode('moves')}>Fewest Moves</button>
          <button className={`ghost-btn${sortMode === 'score' ? ' active' : ''}`} onClick={() => setSortMode('score')}>Highest Score</button>
        </div>

        {/* My History tab — user's own solved puzzles */}
        {tab === 'mine' && (
          <>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>
              My {scope === 'daily' ? 'Daily' : 'Level'} History
            </h3>
            {ranked.length === 0 ? (
              <div className="empty-state">
                <p className="muted">No solved puzzles yet.</p>
                <Link href="/play" className="wood-btn">Play Today&apos;s Puzzle</Link>
              </div>
            ) : (
              <div className="list-grid compact-list">
                {ranked.map((entry, index) => (
                  <div key={`${entry.date}-${index}`} className="list-item leaderboard-row">
                    <strong style={{ minWidth: 28 }}>{index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`}</strong>
                    <span style={{ flex: 1, fontSize: '0.82rem' }}>{entry.date}</span>
                    <span style={{ fontSize: '0.82rem' }}>{entry.moves}m</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--accent)' }}>{entry.score}pts</span>
                    <span>{'⭐'.repeat(entry.stars ?? 1)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Global tab */}
        {tab === 'global' && (
          <>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>
              Global {scope === 'daily' ? 'Daily' : 'Level'} Rankings
            </h3>

            {!session && (
              <div className="empty-state">
                <p className="muted">Sign in to see how you rank against other players.</p>
                <button className="wood-btn" onClick={() => signIn(undefined, { callbackUrl: '/auth' })}>
                  Sign in
                </button>
              </div>
            )}

            {session && !online && (
              <p className="muted">You&apos;re offline. Connect to the internet to view global rankings.</p>
            )}

            {canShowGlobal && globalMessage && (
              <p className="muted">{globalMessage}</p>
            )}

            {canShowGlobal && !globalMessage && globalLeaders.length > 0 && (
              <div className="list-grid compact-list">
                {globalLeaders.map((entry) => (
                  <div key={`${entry.rank}-${entry.name}`} className="list-item leaderboard-row">
                    <strong style={{ minWidth: 28 }}>{entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : `#${entry.rank}`}</strong>
                    <span style={{ flex: 1, fontSize: '0.82rem' }}>{entry.name}</span>
                    <span style={{ fontSize: '0.82rem' }}>{entry.moves}m</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--accent)' }}>{entry.score}pts</span>
                    <span>{'⭐'.repeat(entry.stars)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
