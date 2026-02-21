import { formatDateKey } from './date';

export type ActivityEntry = { solved: boolean };

export function calculateStreak(activityByDate: Record<string, ActivityEntry>, fromDate: Date = new Date()): number {
  let streak = 0;
  const cursor = new Date(fromDate);
  while (true) {
    const key = formatDateKey(cursor);
    if (!activityByDate[key]?.solved) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function calculateBestStreak(activityByDate: Record<string, ActivityEntry>): number {
  const dates = Object.keys(activityByDate).sort();
  let best = 0;
  let current = 0;
  let previous: Date | null = null;

  for (const dateKey of dates) {
    if (!activityByDate[dateKey].solved) continue;
    const date = new Date(`${dateKey}T00:00:00`);

    if (!previous) {
      current = 1;
    } else {
      const diff = Math.round((date.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000));
      current = diff === 1 ? current + 1 : 1;
    }

    best = Math.max(best, current);
    previous = date;
  }

  return best;
}
