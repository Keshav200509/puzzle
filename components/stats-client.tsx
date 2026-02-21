'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { syncAllPending } from '@/lib/client/sync';
import { formatDateKey } from '@/lib/core/date';
import { buildHeatmapGrid } from '@/lib/core/heatmap';
import { calculateBestStreak, calculateStreak } from '@/lib/core/streak';
import type { DailyActivityRecord } from '@/lib/storage/db';
import { getAllDailyActivity } from '@/lib/storage/db';

export function StatsClient() {
  const [activity, setActivity] = useState<DailyActivityRecord[]>([]);
  const [syncMessage, setSyncMessage] = useState('Offline/local mode');
  const { data: session } = useSession();

  async function load() {
    setActivity(await getAllDailyActivity());
  }

  useEffect(() => {
    load();
  }, []);

  const activityMap = useMemo(() => Object.fromEntries(activity.map((item) => [item.date, item])), [activity]);
  const solvedMap = useMemo(() => Object.fromEntries(activity.map((item) => [item.date, { solved: item.solved }])), [activity]);
  const streak = calculateStreak(solvedMap);
  const bestStreak = calculateBestStreak(solvedMap);
  const totalSolves = activity.filter((item) => item.solved).length;
  const pendingSync = activity.filter((item) => !item.synced).length;
  const currentDay = formatDateKey(new Date());
  const grid = buildHeatmapGrid(new Date().getFullYear(), activityMap);
  const monthTicks = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  const bestRuns = [...activity]
    .filter((item) => item.solved)
    .sort((a, b) => a.moves - b.moves || b.score - a.score)
    .slice(0, 5);

  const last7 = Array.from({ length: 7 }, (_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() - idx);
    const key = formatDateKey(d);
    return { key, entry: activityMap[key] };
  });

  async function syncNow() {
    const result = await syncAllPending({ online: navigator.onLine, signedIn: Boolean(session) });
    if (!result.ok) {
      setSyncMessage(result.message ?? (result.status === 503 ? 'Database not configured on server.' : 'Sync failed.'));
      return;
    }

    setSyncMessage(`Synced ${result.syncedDaily ?? 0} daily + ${result.syncedLevels ?? 0} level entries.`);
    await load();
  }

  return (
    <main className="page-shell game-page px-4">
      <div className="stats-phone-shell phone-shell-guard max-w-md mx-auto">
        <section className="panel stats-header">
          <h1 style={{ margin: 0 }}>Stats</h1>
          <div className="stats-kpi-grid">
            <div><small>Current streak</small><strong>{streak}</strong></div>
            <div><small>Best streak</small><strong>{bestStreak}</strong></div>
            <div><small>Total solves</small><strong>{totalSolves}</strong></div>
          </div>
          <div className="action-row">
            <span className="muted">Sync: {syncMessage} • Pending {pendingSync}</span>
            <button className="ghost-btn" onClick={syncNow}>Sync now</button>
          </div>
        </section>

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>Heatmap</h2>
          <div className="legend-row">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((intensity) => (<span key={intensity} className={`legend-dot i-${intensity}`} title={`intensity ${intensity}`} />))}
            <span>More</span>
          </div>
          <div className="month-ticks">{monthTicks.map((m, idx) => <span key={m + idx}>{m}</span>)}</div>
          <div className="heatmap-scroll-wrap">
            {grid.map((column, index) => (
              <div key={`week-${index}`} style={{ display: 'grid', gap: 4 }}>
                {column.map((cell, rowIdx) => {
                  const active = cell?.date === currentDay;
                  const className = `heatmap-cell i-${cell?.intensity ?? 0} ${active ? 'today' : ''}`;
                  if (!cell) return <div key={`${index}-${rowIdx}`} className={className} title="empty" />;
                  const info = activityMap[cell.date];
                  const title = `${cell.date} • ${info?.solved ? `moves ${info.moves} • hints ${info.hintsUsed ?? 0} • stars ${info.stars ?? 0}` : 'not solved'}`;
                  return <div key={`${index}-${rowIdx}`} className={className} title={title} />;
                })}
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>Last 7 Days</h2>
          <div className="list-grid compact-list">
            {last7.map((item) => (
              <div key={item.key} className="list-item">
                <span>{item.key}</span>
                <span>{item.entry?.solved ? `Solved in ${item.entry.moves} moves` : 'Not solved'}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 style={{ marginTop: 0 }}>Best Runs</h2>
          <div className="list-grid compact-list">
            {bestRuns.map((item) => (
              <div key={item.date} className="list-item">
                <span>{item.date}</span>
                <span>{item.moves} moves</span>
                <span>{item.score} pts • {'⭐'.repeat(item.stars ?? 1)}</span>
              </div>
            ))}
            {bestRuns.length === 0 && (
              <div className="list-item">
                <span>No solved runs yet</span>
                <span>Play daily to fill this list</span>
              </div>
            )}
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
