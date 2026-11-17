# Secrets, deployment, and supply chain

Environment contract, self-host hardening, Redis, logging, and dependency security.

## Environment contract (canonical)

`packages/helpers/src/env/manifest.ts` — single source of truth.

| Prefix | Meaning | Client-safe? |
|--------|---------|--------------|
| `BONDERY_PUBLIC_*` | URLs, feature flags | Yes |
| `BONDERY_PRIVATE_*` | Secrets (API, auth, webhooks) | No |
| `BONDERY_INFRA_*` | Deploy / runtime plumbing | No |
| `BONDERY_OPS_*` | CI only — never synced to apps | No |
| `DATABASE_URL` | Postgres connection | No |

Each var has `secret: boolean`, `requiredIn`, `targets`, and `exampleValue`.

**CLI:**
- `pnpm run env` — sync root `.env.local` → per-app files
- `pnpm run env:sync` — build helpers, regenerate examples + `turbo.json`, `check:versions` (pre-commit when manifest changes)
- `pnpm run env -- --check` — regenerate + fail if git dirty (**CI**)

**Adding a new secret:**
1. Add to `ENV_MANIFEST` with `secret: true` (and `deployExample` if self-host operators set it)
2. Commit — pre-commit regenerates examples when `manifest.ts` is staged
3. Document in `docs/deploy/secrets.mdx` if rotation-relevant

**API boot:** `assertRequiredEnvAtStartup()` via `checkEnvVariables` + manifest (`apps/api/src/index.ts`).

**Webapp boot:** `runtimeConfig.server.ts` — rejects build placeholders and localhost URLs in production.

**Rotation runbooks:** `docs/deploy/secrets.mdx`.

**CI operator secrets:** Release/deploy workflows fetch **Infisical production** via GitHub OIDC (`infisical-production-secrets`, `ghcr-login-infisical`). Staging Infisical is for release-smoke SMTP only. Turbo and Chrome signing keys (`PRIVATE_CHROME_*`) remain GitHub repository secrets. See [`.github/workflows/README.md`](../../../../.github/workflows/README.md).

## Secrets rules

- No hardcoded API keys, tokens, or passwords in source
- All secrets in env vars with `secret: true` in manifest
- `.env.local` gitignored; production secrets in hosting platform
- Webapp gets **allowlisted vars only** — no `env_file` with full secrets (`check-compose.mjs`)
- API gets `env_file: .env` in compose

## Self-host deployment

Canonical stack: `deploy/bondery/docker-compose.yml` + `docker-compose.postgres.yml`.

| Service | Secrets | Network |
|---------|---------|---------|
| `api` | `env_file: .env` (all secrets) | `dokploy-network` + `internal` |
| `webapp` | Explicit env only (no `env_file`) | `dokploy-network` |
| `db` | Postgres password | `internal` only |
| `redis` | None (no password) | `internal` only |
| `migrate` | Same as API | `internal` |

**Policy lint:** `deploy/bondery/scripts/check-compose.mjs`:
- Webapp must not use `env_file` or reference `PRIVATE_*` (except PostHog allowlist)
- Redis/db must not join `dokploy-network` or get Traefik labels
- API must depend on db healthy + migrate success + redis healthy

**Migrate gate:** `packages/db/scripts/release-migrate.ts` — `prisma migrate deploy` → SQL functions → OAuth client provision. Never runs on `docker compose up` alone.

**Smoke test:** `smoke-bondery-stack.yml` — runtime-config must not leak internal API URL.

**Review trigger:** Redis has no AUTH on private network — defense-in-depth if network isolation fails.

## Redis

| Use | Path |
|-----|------|
| Rate limiting | `lib/platform/rate-limit.ts` — **required in production** |
| Sync wake pub/sub | `lib/sync/wake/redis-bus.ts` |
| WS tickets | `lib/sync/wake/tickets.ts` |

**Gotcha:** `skipOnError: true` on rate limiter — Redis down → limits skipped (degraded security, not fail-closed).

Singleton enforcement: `check-redis-singleton.ts`.

## Logging and observability

- API: Pino via `request.log` / `lib/platform/logger.ts`
- 5xx: full `err` logged server-side; client gets generic message
- Health: `/health/live` (liveness), `/health/ready` (readiness) — readiness rate limited 5 req/min
- Request IDs in error responses

**No centralized log redaction** — see input-storage-and-output.md review trigger.

## Supply chain

| Mechanism | Present? |
|-----------|------------|
| Biome lint in CI | Yes (`.github/workflows/verify.yml`) |
| Lefthook | Yes |
| Route security scripts | Yes (`check-route-security`, `check-no-route-writes`) |
| OpenAPI lint | Yes (`check:openapi`) |
| Compose policy lint | Yes (`check-compose.mjs`) |
| Dependabot | **No** |
| CodeQL / Snyk / Trivy | **No** |
| `pnpm audit` in CI | **No** |
| Container image scanning | **No** |

**Guidance:** evaluate `pnpm audit` findings by exploitability — do not blindly `pnpm audit fix`. Lock files committed; CI uses `pnpm install --frozen-lockfile`.

**Review trigger:** add Dependabot and/or `pnpm audit` CI job; container scanning in release workflows.

## CI security gates

```bash
pnpm run env -- --check
pnpm --filter api run check:types     # route-security, no-route-writes, redis-singleton
pnpm --filter api run test:auth       # OAuth PKCE integration (optional; Postgres required)
node deploy/bondery/scripts/check-compose.mjs
```

**Stale CI note:** `verify.yml` may still grep for Supabase services (`kong|auth|rest`) — current compose uses `db|redis|migrate|api|webapp` only.

## Deployment checklist

- [ ] New secret in `ENV_MANIFEST` with `secret: true`
- [ ] Examples regenerated (automatic on commit when `manifest.ts` changes; CI `env --check` as safety net)
- [ ] Webapp compose service has no `env_file` with private secrets
- [ ] Redis required in production for rate limiting
- [ ] Migrations run via `release-migrate` before app traffic
- [ ] No secrets in committed example files (placeholder values only)
- [ ] Rotation documented in `docs/deploy/secrets.mdx` if applicable
