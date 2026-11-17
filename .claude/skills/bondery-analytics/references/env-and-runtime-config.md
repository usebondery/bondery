# Env and runtime config

Canonical analytics environment variables.

## Public (browser-safe)

| Variable | App | Purpose |
|----------|-----|---------|
| `BONDERY_PUBLIC_POSTHOG_KEY` | webapp | PostHog project API key (init) |
| `BONDERY_PUBLIC_POSTHOG_HOST` | webapp | PostHog API host (default `https://eu.i.posthog.com`) |
| `BONDERY_PUBLIC_PLAUSIBLE_DOMAIN` | website | Plausible site domain |
| `BONDERY_PUBLIC_PLAUSIBLE_HOST` | website | Plausible CE base URL |

Do not add private PostHog Query API keys. Operators use the PostHog product UI for DAU/WAU/MAU/NPS.

## Infra (Plausible CE deploy)

| Variable | Purpose |
|----------|---------|
| `BONDERY_INFRA_PLAUSIBLE_DOMAIN` | Traefik / CE public URL |
| `BONDERY_INFRA_PLAUSIBLE_DISABLE_REGISTRATION` | e.g. `invite_only` |
| `BONDERY_PRIVATE_PLAUSIBLE_*` | CE secrets (see `deploy/plausible/.env.example`) |

## Runtime config (webapp)

`packages/schemas/src/runtime-config.ts` exposes optional `posthogKey` and `posthogHost` to the client via `window.__BONDERY_RUNTIME_CONFIG__`.

Wiring:

- `apps/webapp/src/lib/platform/runtimeConfig.env.ts` — env key names
- `apps/webapp/src/lib/platform/runtimeConfig.server.ts` — server injection

Do not hardcode `eu.i.posthog.com` in feature code — use runtime config or server wrapper default.

## Sync workflow

Root `.env.local` syncs to per-app files via `pnpm run env`. New analytics vars must be added to `packages/helpers/src/env/manifest.ts` and example generators as needed.

## Env checklist

- [ ] New keys added to `manifest.ts` with correct `public` / `private` classification
- [ ] Examples updated (`deploy/bondery/.env.example`, app `.env.*.example` if applicable)
- [ ] Private keys never in `BONDERY_PUBLIC_*` or runtime config schema
- [ ] `turbo.json` global env passthrough if required for builds
