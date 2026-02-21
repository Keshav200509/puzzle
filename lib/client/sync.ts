import {
  getAllDailyActivity,
  getAllLevelRuns,
  markDailySynced,
  markLevelRunsSynced,
  type DailyActivityRecord,
  type LevelRunRecord
} from '@/lib/storage/db';

type SyncResult = { ok: boolean; status?: number; message?: string; syncedDaily?: number; syncedLevels?: number };

function isBetterRun(candidate: { moves: number; score: number }, current: { moves: number; score: number }) {
  return candidate.moves < current.moves || (candidate.moves === current.moves && candidate.score > current.score);
}

function bestDailyEntries(entries: DailyActivityRecord[]) {
  const byDate = new Map<string, DailyActivityRecord>();
  for (const entry of entries) {
    const current = byDate.get(entry.date);
    if (!current || isBetterRun(entry, current)) {
      byDate.set(entry.date, entry);
    }
  }
  return [...byDate.values()];
}

function bestLevelEntries(entries: LevelRunRecord[]) {
  const byLevel = new Map<number, LevelRunRecord>();
  for (const entry of entries) {
    const current = byLevel.get(entry.level);
    if (!current || isBetterRun(entry, current)) {
      byLevel.set(entry.level, entry);
    }
  }
  return [...byLevel.values()];
}

async function postBatch(dailyEntries: DailyActivityRecord[], levelEntries: LevelRunRecord[]) {
  const [dailyRes, levelRes] = await Promise.all([
    fetch('/api/sync/daily-scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entries: dailyEntries.map((d) => ({
          date: d.date,
          moves: d.moves,
          hintsUsed: d.hintsUsed ?? 0,
          score: d.score,
          stars: d.stars ?? 1
        }))
      })
    }),
    fetch('/api/sync/level-scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entries: levelEntries.map((l) => ({
          level: l.level,
          moves: l.moves,
          hintsUsed: l.hintsUsed,
          score: l.score,
          stars: l.stars
        }))
      })
    })
  ]);

  if (!dailyRes.ok || !levelRes.ok) {
    return { ok: false, status: dailyRes.ok ? levelRes.status : dailyRes.status };
  }

  return { ok: true };
}

export async function syncPendingEntries(dailyEntries: DailyActivityRecord[], levelEntries: LevelRunRecord[]): Promise<SyncResult> {
  const bestDaily = bestDailyEntries(dailyEntries);
  const bestLevels = bestLevelEntries(levelEntries);

  let attempts = 0;
  let lastStatus: number | undefined;
  while (attempts < 3) {
    attempts += 1;
    const result = await postBatch(bestDaily, bestLevels);
    if (result.ok) {
      return { ok: true, syncedDaily: dailyEntries.length, syncedLevels: levelEntries.length };
    }

    lastStatus = result.status;
    if (lastStatus && lastStatus < 500) break;
    await new Promise((resolve) => setTimeout(resolve, 250 * attempts));
  }

  return { ok: false, status: lastStatus, message: 'Batch sync failed' };
}

export async function syncAllPending({ online, signedIn }: { online: boolean; signedIn: boolean }): Promise<SyncResult> {
  if (!signedIn) return { ok: false, message: 'Sign in to sync globally.' };
  if (!online) return { ok: false, message: 'Offline mode' };

  const unsyncedDaily = (await getAllDailyActivity()).filter((entry) => !entry.synced);
  const unsyncedLevels = (await getAllLevelRuns()).filter((entry) => !entry.synced);
  if (unsyncedDaily.length === 0 && unsyncedLevels.length === 0) {
    return { ok: true, syncedDaily: 0, syncedLevels: 0 };
  }

  const result = await syncPendingEntries(unsyncedDaily, unsyncedLevels);
  if (!result.ok) return result;

  await markDailySynced(unsyncedDaily.map((entry) => entry.date));
  await markLevelRunsSynced(unsyncedLevels.map((entry) => entry.id));
  return { ok: true, syncedDaily: unsyncedDaily.length, syncedLevels: unsyncedLevels.length };
}
