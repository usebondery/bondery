# Bondery Webapp

## Development

Default local URL is Portless HTTPS: `https://app.usebondery.test` (port `26632`).

```bash
pnpm --filter webapp run dev
```

Do not pass workspace `-w` flags into the script (`pnpm run dev -w webapp` breaks Next).

- **Classic escape hatch:** `pnpm --filter webapp run dev:classic` → `http://localhost:26632`
- **SSR:** set `BONDERY_INFRA_INTERNAL_API_URL=http://127.0.0.1:26631` so server fetches hit the API loopback. The browser still uses `BONDERY_PUBLIC_API_URL` (Portless).
- **Windows hosts:** elevated PowerShell once — from the repo root, `node scripts/dev/portless-alias.mjs` then `pnpm exec portless hosts sync`. Aliases are static, so this is not needed again after a dev restart.
- **OAuth:** register `https://api.usebondery.test/auth/callback/github` (and LinkedIn). Classic `http://localhost:26631/...` remains the escape hatch.
