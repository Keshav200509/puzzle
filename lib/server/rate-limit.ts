const WINDOW_MS = 60_000;
const MAX_HITS = 40;

const bucket = new Map<string, { hits: number; resetAt: number }>();

export function checkRateLimit(key: string) {
  const now = Date.now();
  const current = bucket.get(key);

  if (!current || current.resetAt < now) {
    bucket.set(key, { hits: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (current.hits >= MAX_HITS) {
    return { allowed: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.hits += 1;
  return { allowed: true };
}
