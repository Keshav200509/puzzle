# Online Verification Checklist

Use this when real env vars are configured.

## 1) DB health
```bash
curl -i http://localhost:3000/api/health/db
```
Expect `200` with `connected: true` when DB is reachable, otherwise `503` with a clear message.

## 2) Auth/session
1. Open `/auth`.
2. Click **Sign in with Google**.
3. After redirect, check session:
```bash
curl -i http://localhost:3000/api/auth/session
```
Expect `user` object when signed in.

## 3) Sync (daily + level)
After solving one daily and one level run while signed in:
```bash
curl -i -X POST http://localhost:3000/api/sync/daily-scores \
  -H 'Content-Type: application/json' \
  --cookie '<next-auth-session-cookie>' \
  -d '{"entries":[{"date":"2026-02-20","moves":22,"hintsUsed":0,"score":784,"stars":3}]}'

curl -i -X POST http://localhost:3000/api/sync/level-scores \
  -H 'Content-Type: application/json' \
  --cookie '<next-auth-session-cookie>' \
  -d '{"entries":[{"level":1,"moves":20,"hintsUsed":0,"score":784,"stars":3}]}'
```
Expect `200` and `{ ok: true }`.

## 4) Leaderboards
```bash
curl -i "http://localhost:3000/api/leaderboard/daily?date=2026-02-20"
curl -i "http://localhost:3000/api/leaderboard/levels?level=1"
```
Expect top rows in `leaders` when DB has data.

## 5) UI pass
1. `/stats` → click **Sync now**, verify success message.
2. `/leaderboard` → verify **Global** tab appears only when signed in, online, and DB healthy.
