# Troubleshooting installs (npm 403 / blocked environments)

## Symptom

`npm install` fails with `403 Forbidden` from `https://registry.npmjs.org/...`.

## Common causes

1. A proxy is injected through environment variables (`http-proxy`, `https-proxy`, `HTTP_PROXY`, `HTTPS_PROXY`) but is invalid/restricted.
2. A private registry URL is configured globally in user npm config.
3. Corporate mirror requires authentication token that is missing.
4. CI/environment policy blocks direct outbound package access.

## Quick diagnostics

```bash
npm config get registry
npm config list -l | grep -E "registry|proxy|https-proxy|http-proxy"
[ -f .npmrc ] && cat .npmrc || echo "no repo-level .npmrc"
```

Expected public registry:

```text
https://registry.npmjs.org/
```

## Force public registry for current shell

```bash
npm config set registry https://registry.npmjs.org/
npm config delete proxy
npm config delete https-proxy
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
npm install
```

## Docker workaround (preferred)

Use containerized dev/test to isolate host npm config:

```bash
docker compose up --build
docker compose run --rm app npm test
```

## If direct npm remains blocked

- Use your org-approved mirror and auth token in user-level `~/.npmrc`.
- Or try an alternate package manager (`pnpm`/`yarn`) if permitted.
- Keep lockfiles stable and avoid switching managers within the same branch unless planned.
