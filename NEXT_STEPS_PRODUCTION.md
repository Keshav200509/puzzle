# Next Critical Steps to Production (Guided Vision)

This is the prioritized path from the current build to production readiness.

## Phase 1 — Stabilize quality gates (do now)
1. Keep `npm run verify` green in CI on every push.
2. Keep Playwright core suite (`npm run test:e2e`) green as release gate.
3. Run env-gated suite (`npm run test:e2e:env`) in environments with real credentials.

## Phase 2 — Finalize runtime configuration
1. Set all required env vars and run `npm run preflight`.
2. Validate health endpoints:
   - `/api/health/app`
   - `/api/health/auth`
   - `/api/health/db`
3. Run `npm run prisma:migrate` against real Postgres.

## Phase 3 — Production hardening
1. ✅ Baseline structured API logging and unhandled API error reporting are implemented.
2. Add external error monitoring + alerting sink (Sentry/Datadog/etc.).
3. Add backup + restore procedure for Postgres.
4. Add uptime checks for app + db health endpoints.

## Phase 4 — Lightweight deployment approach (no Docker)
Use a small VPS approach:
1. Provision Ubuntu VM.
2. Install Node LTS + Postgres (managed DB recommended).
3. Build app with `npm run build`.
4. Run with `npm run start` behind `systemd` service.
5. Put Nginx in front for TLS and reverse proxy.

This keeps deployment lightweight and operationally common for small-to-medium Next.js apps.

## Phase 5 — Go-live checklist
1. Smoke test routes and auth flow in production URL.
2. Validate sync + leaderboard writes with real account.
3. Confirm guest offline flow still works.
4. Monitor for 24 hours before announcing availability.
