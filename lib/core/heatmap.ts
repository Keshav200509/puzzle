import { getYearDayKeys } from './date';

export type DailyActivity = {
  solved: boolean;
  difficulty: number;
  score: number;
  moves?: number;
  timeTaken?: number;
  hintsUsed?: number;
};

export function getIntensity(activity?: DailyActivity): 0 | 1 | 2 | 3 | 4 {
  if (!activity?.solved) return 0;

  const moves = activity.moves ?? 999;
  const hints = activity.hintsUsed ?? 0;

  if (activity.score >= 1000 && moves <= 16 && hints === 0) return 4;
  if (activity.difficulty >= 3 || moves <= 22) return 3;
  if (activity.difficulty === 2 || moves <= 30) return 2;
  return 1;
}

export function buildHeatmapGrid(year: number, activityByDate: Record<string, DailyActivity>) {
  const days = getYearDayKeys(year);
  const firstDay = new Date(year, 0, 1).getDay();
  const leading = Array.from({ length: firstDay }, () => null);
  const cells = [...leading, ...days.map((date) => ({ date, intensity: getIntensity(activityByDate[date]) }))];

  const columns: Array<Array<{ date: string; intensity: number } | null>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    const week = cells.slice(i, i + 7);
    while (week.length < 7) week.push(null);
    columns.push(week as Array<{ date: string; intensity: number } | null>);
  }
  return columns;
}
