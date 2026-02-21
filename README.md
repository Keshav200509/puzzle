# The Grid (Logic Looper)

Offline-first daily pipe puzzle built with Next.js 14 + TypeScript.

## Routes

- `/` landing onboarding
- `/auth` sign-in page with guest fallback
- `/home` dashboard
- `/play` daily 5x5 carved tunnel puzzle (sliding blocks)
- `/levels` deterministic level mode with scaling difficulty
- `/stats` phone-first streak + heatmap + last 7 days + best runs
- `/leaderboard` local-first leaderboard with optional global tab

## Backend readiness

Implemented with graceful fallbacks:

- Prisma schema for `User`, `DailyScore`, `LevelScore` with unique keys + indexes.
- Prisma migration folder ready for `prisma migrate deploy`.
- NextAuth route + session provider wiring.
- Offline-first guest mode when env vars are missing.
- Sync endpoints:
  - `POST /api/sync/daily-scores`
  - `POST /api/sync/level-scores`
- Leaderboard endpoints:
  - `GET /api/leaderboard/daily?date=YYYY-MM-DD`
  - `GET /api/leaderboard/levels?level=N`
- Basic structured API logs and unhandled API error reporting are enabled server-side.
- Health endpoints:
  - `GET /api/health/app`
  - `GET /api/health/auth`
  - `GET /api/health/db`

When `DATABASE_URL` is missing, DB-backed endpoints return clear `503` responses with `DB_NOT_CONFIGURED` and the app continues in offline mode.

## Required environment variables

- `DATABASE_URL` → enables Prisma writes and global leaderboard reads.
- `NEXTAUTH_URL` + `NEXTAUTH_SECRET` → enables NextAuth production sessions.
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` → enables Google sign-in.

Without these values, guest mode remains fully playable offline.

## Commands

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run preflight
npm run dev
npm test
npm run lint
npm run build
npm run verify
```


## Production roadmap

See `NEXT_STEPS_PRODUCTION.md` for the prioritized path to launch.
