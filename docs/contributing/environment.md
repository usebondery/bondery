# Environment configuration

Bondery uses one naming scheme everywhere and one root file for local development.

## Naming contract

| Prefix | Meaning | Who may read it |
| --- | --- | --- |
| `BONDERY_PUBLIC_*` | Safe for browsers / mobile / extension | Any product surface |
| `BONDERY_PRIVATE_*` | Secrets | API (and local Supabase Auth OAuth secrets) |
| `BONDERY_INFRA_*` | Domains, image tags, internal DNS, build metadata | Deploy + webapp runtime |
| `BONDERY_OPS_*` | CI / release tooling | GitHub Actions only — not synced into app local files |

**Same fact → same key name** in every app (e.g. `BONDERY_PUBLIC_API_URL` on api, webapp, extension, and mobile).

## Local happy path

```bash
npm install
npm run setup:dev
# edit .env.local (OAuth clients, optional integrations)
cd apps/supabase-db && npm run dev
npm run env
npm run dev
```

| Script | Purpose |
| --- | --- |
| `npm run setup:dev` | First clone: create `.env.local`, then run `env` |
| `npm run env` | Pull Supabase keys (if up) → sync apps → check root |

Codegen / CI (not day-to-day DX):

```bash
npm run env -- --write-examples --write-turbo   # regenerate committed examples + turbo.json
npm run env -- --check                          # regenerate + fail if git dirty
```

Optional flags on `env`: `--no-pull`, `--skip-check`, `--dry-run`, `--only=api,webapp`.

## Authoring vs generated files

| Edit | Do not edit |
| --- | --- |
| Root [`.env.local`](../../.env.local) (gitignored) | `apps/*/.env*.local` (generated) |
| Manifest [`packages/helpers/src/env/manifest.ts`](../../packages/helpers/src/env/manifest.ts) | Generated `*.example` headers say “do not edit” |

Template: [`.env.local.example`](../../.env.local.example).

## Platform adapters (why not `NEXT_PUBLIC_` / `EXPO_PUBLIC_`)

- **Webapp** — runtime config via dynamic `process.env[name]` + `/runtime-config.json` (same Docker image, many environments). Never use `NEXT_PUBLIC_*` for product config.
- **Website** — Server Components / route handlers read `BONDERY_PUBLIC_*` from `process.env`. Client leaves receive values as RSC props (no `next.config` `env`, no `NEXT_PUBLIC_*`).
- **Mobile** — Expo only auto-inlines `EXPO_PUBLIC_*`. We load `BONDERY_PUBLIC_*` in `app.config.ts` into `extra`, and [`apps/mobile/src/lib/config.ts`](../../apps/mobile/src/lib/config.ts) reads `Constants.expoConfig.extra`.
- **Chrome extension** — Vite `envPrefix: ["BONDERY_PUBLIC_", "WXT_"]`.
- **supabase-db** — Auth redirect/OAuth still use `BONDERY_SUPABASE_*` names required by `config.toml` (the only intentional exception to `BONDERY_PRIVATE_*` for OAuth client secrets). Sync derives `BONDERY_SUPABASE_WEBAPP_URL` / webapp callback from `BONDERY_PUBLIC_WEBAPP_URL`, and `BONDERY_SUPABASE_AUTH_CALLBACK_URL` from `BONDERY_PUBLIC_SUPABASE_URL` (`{url}/auth/v1/callback`).

Out-of-runtime Next scripts (`check-env`, `announce`) call `loadEnvConfig` from `@next/env` so load order matches `next dev` / `next build`.

## Production / self-host

Operators use [`deploy/bondery/.env`](../../deploy/bondery/.env.example) with Compose — same `BONDERY_*` names. See [Dokploy deploy](../deploy/dokploy.md).

## Manifest

[`@bondery/helpers/env`](../../packages/helpers/src/env/manifest.ts) is the single contract: canonical keys, which apps receive them, `requiredIn`, and turbo scopes. Per-app `check-env` scripts read required lists from the manifest (API also cross-checks `required-env.ts`).
