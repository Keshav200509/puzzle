export const SCORE_BASE = 1400;
export const SCORE_PER_MOVE = 28;
export const SCORE_PER_HINT = 140;

export function computeDailyScore(moves: number, hintsUsed: number): number {
  const safeMoves = Math.max(0, Math.floor(moves));
  const safeHints = Math.max(0, Math.floor(hintsUsed));
  return Math.max(0, SCORE_BASE - safeMoves * SCORE_PER_MOVE - safeHints * SCORE_PER_HINT);
}

export function computeStars(moves: number, difficulty: number): 1 | 2 | 3 {
  const base = 16 + difficulty * 4;
  if (moves <= base) return 3;
  if (moves <= base + 8) return 2;
  return 1;
}
