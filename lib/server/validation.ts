import { computeDailyScore } from '@/lib/core/scoring';

export type DailySyncEntry = {
  date: string;
  moves: number;
  hintsUsed: number;
  score: number;
  stars: number;
};

export type LevelSyncEntry = {
  level: number;
  moves: number;
  hintsUsed: number;
  score: number;
  stars: number;
};

type ValidatedDaily = {
  date: Date;
  moves: number;
  hintsUsed: number;
  score: number;
  stars: number;
};

type ValidatedLevel = {
  level: number;
  moves: number;
  hintsUsed: number;
  score: number;
  stars: number;
};

function ensureWholeNumber(value: number) {
  return Number.isFinite(value) && Number.isInteger(value);
}

export function isBetterRun(candidate: { moves: number; score: number }, current: { moves: number; score: number }) {
  return candidate.moves < current.moves || (candidate.moves === current.moves && candidate.score > current.score);
}

export function validateDailyEntry(entry: DailySyncEntry): string | null {
  const day = new Date(`${entry.date}T00:00:00Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (Number.isNaN(day.getTime()) || day > today) return 'Invalid or future date';
  if (!ensureWholeNumber(entry.moves) || entry.moves < 1 || entry.moves > 500) return 'Invalid moves range';
  if (!ensureWholeNumber(entry.hintsUsed) || entry.hintsUsed < 0 || entry.hintsUsed > 10) return 'Invalid hints range';
  if (!ensureWholeNumber(entry.stars) || entry.stars < 1 || entry.stars > 3) return 'Invalid stars range';

  const expected = computeDailyScore(entry.moves, entry.hintsUsed);
  if (!ensureWholeNumber(entry.score) || entry.score !== expected) return 'Score mismatch';

  return null;
}

export function validateLevelEntry(entry: LevelSyncEntry): string | null {
  if (!ensureWholeNumber(entry.level) || entry.level < 1 || entry.level > 9999) return 'Invalid level';
  if (!ensureWholeNumber(entry.moves) || entry.moves < 1 || entry.moves > 800) return 'Invalid moves range';
  if (!ensureWholeNumber(entry.hintsUsed) || entry.hintsUsed < 0 || entry.hintsUsed > 10) return 'Invalid hints range';
  if (!ensureWholeNumber(entry.stars) || entry.stars < 1 || entry.stars > 3) return 'Invalid stars range';

  const expected = computeDailyScore(entry.moves + entry.level * 2, entry.hintsUsed);
  if (!ensureWholeNumber(entry.score) || entry.score !== expected) return 'Score mismatch';

  return null;
}

export function normalizeDailyEntry(entry: DailySyncEntry): ValidatedDaily {
  return {
    date: new Date(`${entry.date}T00:00:00Z`),
    moves: entry.moves,
    hintsUsed: entry.hintsUsed,
    score: computeDailyScore(entry.moves, entry.hintsUsed),
    stars: entry.stars
  };
}

export function normalizeLevelEntry(entry: LevelSyncEntry): ValidatedLevel {
  return {
    level: entry.level,
    moves: entry.moves,
    hintsUsed: entry.hintsUsed,
    score: computeDailyScore(entry.moves + entry.level * 2, entry.hintsUsed),
    stars: entry.stars
  };
}
