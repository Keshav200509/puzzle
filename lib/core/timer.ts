export function resolveElapsedSeconds(startedAt: number, nowMs: number, persistedElapsed: number = 0): number {
  const measured = Math.max(0, Math.floor((nowMs - startedAt) / 1000));
  return Math.max(Math.floor(persistedElapsed), measured);
}
