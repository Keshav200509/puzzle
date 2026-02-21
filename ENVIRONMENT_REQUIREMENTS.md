# Environment Requirements (Validation Gate)

Current branch cannot complete local install/test in this runner because npm package download is blocked (`403 Forbidden`).

## Required validation lane

Use **one** of the following:

1. **Docker available** (preferred):
   - `docker compose up --build`
   - `docker compose run --rm app npm test`

2. **Registry allowlist available** (host install path):
   - Allow outbound access to `https://registry.npmjs.org/`
   - Remove/override blocked proxy settings and run install locally.

## Exact npm config required

```bash
npm config set registry https://registry.npmjs.org/
npm config delete proxy || true
npm config delete https-proxy || true
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
npm install
```

Until one of the above lanes is available and passing, feature work for Phase A+ should remain blocked.
