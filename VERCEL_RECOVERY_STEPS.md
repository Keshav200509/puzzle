# Vercel Recovery Steps (Auth + Deployment)

Use this when Vercel shows failures like:
- `NO_SECRET` on `/api/auth/session` or `/api/auth/_log`
- deployment build failing or using the wrong commit

---


## 0) Run auth-route structural guard locally

Before pushing/redeploying, run:

```bash
npm run check:auth-route
```

This prevents a known merge-corruption case where duplicate `export async function GET(...)` blocks break Vercel builds.

---

## 1) Confirm you are deploying the right commit

In local repo:

```bash
git checkout main
git pull origin main
git log --oneline -n 5
```

In Vercel dashboard:
- Open project → **Deployments**
- Confirm the deployment commit hash matches latest `main`
- If Vercel is still building an older hash (for example `57753b8`), redeploy after syncing/pushing latest `main`.

If hashes do not match, push latest commit:

```bash
git push origin main
```

---

## 2) Set required Vercel environment variables

In Vercel dashboard:
- Project → **Settings** → **Environment Variables**

Set these values for **Production** (and Preview if you test there):

- `NEXTAUTH_URL` = your deployed app URL (for example: `https://your-app.vercel.app`)
- `NEXTAUTH_SECRET` = a strong random secret
  - If you already use `AUTH_SECRET`, you can keep it, but `NEXTAUTH_SECRET` is recommended.

Generate secret locally:

```bash
openssl rand -base64 32
```

Important:
- No quotes around values in dashboard.
- Do not leave blank spaces before/after values.

---

## 3) Force a clean redeploy after env update

From Vercel dashboard:
- Open latest deployment
- Click **Redeploy**
- Choose option to use current env vars

Or from CLI:

```bash
npx vercel --prod
```

---

## 4) Inspect deployment logs

```bash
npx vercel inspect <deployment_id> --logs
```

Example:

```bash
npx vercel inspect dpl_3cUKKyZbVMiLiDwAS7geZCNJhUFm --logs
```

If CLI asks login, run:

```bash
npx vercel login
```

If using token-based CI/local auth:

```bash
export VERCEL_TOKEN=<your_token>
npx vercel inspect <deployment_id> --logs --token "$VERCEL_TOKEN"
```

---

## 5) Verify health endpoints after deploy

Replace with your domain:

```bash
curl -i https://your-app.vercel.app/api/health/app
curl -i https://your-app.vercel.app/api/health/auth
curl -i https://your-app.vercel.app/api/health/db
curl -i https://your-app.vercel.app/api/auth/session
```

Expected:
- `/api/health/app` → `200`
- `/api/health/auth` → `200` when auth configured, `503` when not configured
- `/api/auth/session` should not return unhandled 500 repeatedly

---

## 6) If still failing, check these common mismatches

1. **Wrong Vercel project linked**
   - `npx vercel link` and confirm project/team.
2. **Env var only set in Preview, not Production** (or vice versa).
3. **Old deployment URL tested** instead of latest deployment URL.
4. **Branch protection blocked latest push** so Vercel builds old code.

---

## 7) One-command local sanity check before pushing

```bash
npm run build && npm test
```

Then:

```bash
git add -A
git commit -m "your fix"
git push origin main
```

---

## Quick decision tree

- Build fails with syntax error on Vercel but local build passes:
  - likely wrong commit deployed.
- Runtime shows `NO_SECRET`:
  - missing or wrong `NEXTAUTH_SECRET`/`NEXTAUTH_URL` in deployment env.
- `vercel inspect` fails locally:
  - CLI not authenticated or network blocked in your shell environment.
