import { openDB, type IDBPDatabase } from 'idb';

export type DailyActivityRecord = {
  date: string;
  solved: boolean;
  score: number;
  moves: number;
  timeTaken: number;
  difficulty: number;
  hintsUsed?: number;
  stars?: number;
  synced: boolean;
  playerName?: string;
};

export type LevelRunRecord = {
  id: string;
  level: number;
  solved: boolean;
  score: number;
  moves: number;
  hintsUsed: number;
  stars: number;
  playedAt: number;
  synced: boolean;
  playerName?: string;
};

export type PuzzleProgressRecord = {
  date: string;
  puzzleType: string;
  state: Record<string, unknown>;
  hintsUsed: number;
  startedAt: number;
  elapsedSeconds: number;
  moves: number;
};

export type PlayerProfileRecord = {
  id: 'self';
  name: string;
  createdAt: number;
  updatedAt: number;
};

type LogicLooperDb = {
  dailyActivity: { key: string; value: DailyActivityRecord };
  puzzleProgress: { key: string; value: PuzzleProgressRecord };
  levelRuns: { key: string; value: LevelRunRecord };
  playerProfile: { key: 'self'; value: PlayerProfileRecord };
};

const DB_NAME = 'logic-looper-db';
const DB_VERSION = 6;

let dbPromise: Promise<IDBPDatabase<LogicLooperDb>> | null = null;

function isBetterRun(a: { moves: number; score: number }, b: { moves: number; score: number }) {
  return a.moves < b.moves || (a.moves === b.moves && a.score > b.score);
}

async function getDb(): Promise<IDBPDatabase<LogicLooperDb> | null> {
  if (typeof window === 'undefined' || !('indexedDB' in globalThis)) return null;
  if (!dbPromise) {
    dbPromise = openDB<LogicLooperDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('dailyActivity')) db.createObjectStore('dailyActivity', { keyPath: 'date' });
        if (!db.objectStoreNames.contains('puzzleProgress')) db.createObjectStore('puzzleProgress', { keyPath: 'date' });
        if (!db.objectStoreNames.contains('levelRuns')) db.createObjectStore('levelRuns', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('playerProfile')) db.createObjectStore('playerProfile', { keyPath: 'id' });
      }
    });
  }
  return dbPromise;
}

export async function getAllDailyActivity(): Promise<DailyActivityRecord[]> {
  const db = await getDb();
  return db ? db.getAll('dailyActivity') : [];
}

export async function getDailyActivity(date: string): Promise<DailyActivityRecord | undefined> {
  const db = await getDb();
  return db ? db.get('dailyActivity', date) : undefined;
}

export async function upsertDailyActivity(entry: DailyActivityRecord): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db.get('dailyActivity', entry.date);
  if (!existing || isBetterRun(entry, existing)) {
    await db.put('dailyActivity', entry);
  }
}

export async function markDailySynced(dates: string[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  for (const date of dates) {
    const item = await db.get('dailyActivity', date);
    if (!item) continue;
    await db.put('dailyActivity', { ...item, synced: true });
  }
}

export async function getPuzzleProgress(date: string): Promise<PuzzleProgressRecord | undefined> {
  const db = await getDb();
  return db ? db.get('puzzleProgress', date) : undefined;
}

export async function upsertPuzzleProgress(entry: PuzzleProgressRecord): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.put('puzzleProgress', entry);
}

export async function clearPuzzleProgress(date: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete('puzzleProgress', date);
}

export async function addLevelRun(entry: LevelRunRecord): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.put('levelRuns', entry);
}

export async function getAllLevelRuns(): Promise<LevelRunRecord[]> {
  const db = await getDb();
  return db ? db.getAll('levelRuns') : [];
}

export async function markLevelRunsSynced(ids: string[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  for (const id of ids) {
    const run = await db.get('levelRuns', id);
    if (!run) continue;
    await db.put('levelRuns', { ...run, synced: true });
  }
}

export async function getPlayerProfile(): Promise<PlayerProfileRecord | undefined> {
  const db = await getDb();
  return db ? db.get('playerProfile', 'self') : undefined;
}

export async function upsertPlayerProfile(name: string): Promise<PlayerProfileRecord | null> {
  const db = await getDb();
  if (!db) return null;
  const now = Date.now();
  const cleanName = name.trim().slice(0, 24) || 'Guest Explorer';
  const existing = await db.get('playerProfile', 'self');
  const next: PlayerProfileRecord = {
    id: 'self',
    name: cleanName,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  await db.put('playerProfile', next);
  return next;
}

export async function getOrCreatePlayerProfile(): Promise<PlayerProfileRecord | null> {
  const existing = await getPlayerProfile();
  if (existing) return existing;
  return upsertPlayerProfile(`Player-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
}
