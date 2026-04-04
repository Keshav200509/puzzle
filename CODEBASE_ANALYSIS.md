# Codebase Analysis: The Grid (Logic Looper)

This document captures a structured understanding of how the project currently works.

## 1) High-level architecture

The app is a **Next.js 14 App Router** project with a clear split across:

- `app/`: route handlers (`/api/*`) and page entrypoints.
- `components/`: client-facing UI containers for each page.
- `lib/core/`: deterministic core logic (date, scoring, streaks, heatmap, seed).
- `lib/puzzles/pipe-grid/`: puzzle domain model, generation, move logic, path validation, and board UI.
- `lib/storage/`: IndexedDB persistence for offline/local play.
- `lib/client/`: sync orchestration from local to server endpoints.
- `lib/server/`: auth, prisma lifecycle, input validation, rate limit, observability.
- `prisma/`: schema + migration for production persistence.
- `tests/`: vitest coverage for core game and utility logic.

Design intent is strongly **offline-first with graceful online upgrade**: local play always works; online sync + global leaderboards are enabled when auth and DB are configured.

## 2) Gameplay model (pipe-grid)

Core puzzle behavior is intentionally deterministic and reproducible:

- Level generation (`generator.ts`) creates a 5x5 board with fixed start/end anchors and a guaranteed solved spine on row 2 before scramble.
- Scrambling is implemented as legal empty-cell slides, with optional locks and move count based on difficulty/level config.
- Runtime interaction (`gameplay.ts`) only allows Manhattan-adjacent slides into the empty cell and blocks locked/empty tiles.
- Completion check (`validator.ts`) performs graph traversal from start to end using per-shape openings and reciprocal connectivity.

Notable property: generation + validation are separate modules, which keeps rendering/UI independent of puzzle correctness logic.

## 3) Daily mode flow (`PlayClient`)

Daily mode lifecycle:

1. Compute `dayKey` (or use query override), derive seed hash with static secret.
2. Generate puzzle deterministically for day.
3. Rehydrate saved progress from IndexedDB when present.
4. On each move:
   - apply slide,
   - increment move counter,
   - validate connected path.
5. On solve:
   - compute score/stars,
   - write daily activity record locally,
   - clear transient puzzle progress,
   - opportunistically sync if signed in and online.

Additional details:

- Day rollover polling auto-refreshes puzzle when date changes.
- Hint usage is persisted as part of progress and bounded by `HINT_LIMIT`.
- Streak is recomputed from local activity, not server state.

## 4) Level mode flow (`LevelsClient`)

Level mode is progression-oriented:

- Uses `levelConfig(levelNumber)` to scale scramble count, lock count, and difficulty.
- Tracks best local run per level (fewest moves, then higher score tie-break).
- Unlock logic is derived from number of solved levels (`Math.max(1, Object.keys(runs).length + 1)`).
- On solve, persists a run entry and attempts sync if authenticated/online.

Observation: level mode currently saves in-progress state, but primary UX loop is solve-and-reload for repeated improvement.

## 5) Persistence strategy (offline-first)

`lib/storage/db.ts` wraps IndexedDB via `idb` and exposes simple repository-like helpers:

- `dailyActivity` keyed by date.
- `puzzleProgress` keyed by date/level token.
- `levelRuns` keyed by run id.

Important behavior:

- `upsertDailyActivity` only overwrites with a better run (moves asc, score desc).
- Sync marking (`markDailySynced`, `markLevelRunsSynced`) updates local records after successful server sync.

This design keeps local UX snappy and resilient when services are unavailable.

## 6) Sync protocol and conflict strategy

`lib/client/sync.ts` batches unsynced local data to two endpoints:

- `POST /api/sync/daily-scores`
- `POST /api/sync/level-scores`

Sync choices:

- Deduplicates to best entry per day/level before posting.
- Retries up to 3 times with incremental delay on transient/server failures.
- Marks all pending records as synced only after successful batch completion.

Conflict resolution is consistent client+server side: **better run wins**.

## 7) Server/API behavior

API routes apply the same safety pattern:

- Require session email for sync endpoints.
- Apply in-memory-ish rate limiting (`checkRateLimit`) keyed by forwarded IP.
- Parse/validate request body with strict numeric/date bounds.
- Recompute canonical score server-side to reject tampered payloads.
- Upsert user and write/update only when incoming run is better.

Leaderboard endpoints are read-only and return top rows sorted by moves then score.

Graceful fallback:

- When `DATABASE_URL` is absent, routes return 503 with explicit machine-readable codes (`DB_NOT_CONFIGURED`), matching README promises.

## 8) Auth and environment gating

Auth setup supports two modes:

- Google provider when OAuth env vars are present.
- Guest placeholder remains available for offline/local play flow.

`isNextAuthConfigured`, `isGoogleAuthConfigured`, and DB checks clearly separate operational states.

## 9) Data model (Prisma)

Schema is minimal and aligned with app behavior:

- `User`
- `DailyScore` unique per `(userId, date)`
- `LevelScore` unique per `(userId, level)`

This directly supports idempotent “best score so far” updates and efficient leaderboard reads.

## 10) Testing posture

Vitest suite covers:

- scoring
- generation determinism/regression
- streak logic
- seed determinism
- heatmap
- timer/date utilities
- pipe-grid behavior

Coverage focus is strongest in deterministic logic modules rather than end-to-end UI, which is appropriate for this puzzle architecture.

## 11) Strengths observed

- Clear offline-first product strategy.
- Deterministic generation and validation separation.
- Consistent better-run conflict policy across local, sync, and server writes.
- Explicit, user-safe degraded modes when infra is absent.
- Well-structured, small focused modules.

## 12) Risks / potential refinements

- `checkRateLimit` likely process-memory scoped (typical for simple maps), which is weak across serverless instances.
- Daily seed uses a static secret constant in client modules; adequate for deterministic puzzles, but not tamper-resistant if competitive anti-cheat becomes a priority.
- Some progress persistence in level mode may be under-leveraged (reload-after-solve loop).
- Sync currently sends best records but marks all unsynced as synced after success; this is fine with better-run policy, but worth documenting as intentional lossy compaction.

## 13) Practical mental model

Think of this app as three layers:

1. **Pure puzzle engine** (`lib/core`, `lib/puzzles`) – deterministic and test-heavy.
2. **Offline app shell** (`components`, `lib/storage`) – gameplay + local progression.
3. **Online augmentation** (`app/api`, `lib/server`, Prisma) – auth, sync, and global leaderboard.

Because the layers are relatively decoupled, the codebase should scale cleanly for new puzzle types or richer social features.
