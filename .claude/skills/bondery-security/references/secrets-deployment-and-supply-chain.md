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
| `redis` | Password (ACL file) + TLS certificate from the `redis-secrets` volume | `internal` only |
| `redis-secrets` | Creates the Redis password and certificate (one-shot, no network) | none |
| `migrate` | Same as API | `internal` |

**Policy lint:** `deploy/bondery/scripts/check-compose.mjs`:
- Webapp must not use `env_file` or reference `PRIVATE_*` (except PostHog allowlist)
- Redis/db must not join `dokploy-network` or get Traefik labels
- Redis must require TLS and a password in every stack variant, and the API must connect with both (see [Redis: TLS and authentication](#redis-tls-and-authentication-required))
- API must depend on db healthy + migrate success + redis healthy

**Migrate gate:** `packages/db/scripts/release-migrate.ts` — `prisma migrate deploy` → SQL functions → OAuth client provision. Never runs on `docker compose up` alone.

**Smoke test:** `smoke-bondery-stack.yml` — runtime-config must not leak internal API URL.

## Redis: TLS and authentication (required)

Redis holds session data (Better Auth secondary storage), magic-link and step-up tokens, WebSocket tickets, and rate-limit counters. A private Docker network is not enough protection. **Every Redis that Bondery deploys or connects to must require TLS and authentication.** This applies to the bundled Compose Redis, to an external or managed Redis, and to any new Redis instance or stack variant added later.

Rules:

1. **TLS only.** Redis serves `--tls-port` and disables the plaintext port (`--port 0`). Clients use `rediss://`.
2. **Verify the certificate.** Clients pin a CA (`BONDERY_PRIVATE_REDIS_TLS_CA_FILE`) or use a publicly trusted certificate. Never set `rejectUnauthorized: false` or skip hostname checks.
3. **Authenticate.** Use a strong random password (32+ bytes) through an ACL file or a managed-Redis user. Do not use `requirepass` on the command line, and never set `protected-mode no` on an unauthenticated server.
4. **Secrets in files, not in Compose text.** Pass the password with `BONDERY_PRIVATE_REDIS_PASSWORD_FILE` (volume or Docker secret) or inside `BONDERY_PRIVATE_REDIS_URL` from the secret store. Never commit it, and never put it in an image.
5. **No public exposure.** Redis stays on the private `internal` network. No host `ports:` and no Traefik labels.
6. **Upgrades must stay seamless.** A security change to Redis must not need operator action on existing installs. Generate missing secrets automatically (as the `redis-secrets` job does) and keep existing data.

The only exception is local development Redis on loopback (`deploy/bondery/docker-compose.dev-redis.yml`, `127.0.0.1:26636`). It holds no production data.

How the bundled stack does it:

| Part | Where |
|------|-------|
| Password + self-signed ECDSA certificate (SANs `redis`, `${prefix}-redis`, `localhost`), created once, kept after that, renewed 30 days before expiry | `apps/api/src/lib/data/redis-secrets.ts`, CLI `apps/api/src/cli/ensure-redis-secrets.ts`, Compose service `redis-secrets` |
| Redis stores only the SHA-256 of the password | `server/users.acl` in the `redis-secrets` volume |
| File ownership: `server/` belongs to the Redis user (999), `client/` to the API user (1001), both `0700` | `ensureRedisSecrets()` |
| API reads the password and pinned CA from files | `apps/api/src/lib/data/redis-connection-options.ts` |
| Compose always sets `rediss://${prefix}-redis:6379`. A stale `redis://` value in `.env` or Infisical does not apply | `deploy/bondery/docker-compose*.yml` |
| Production API logs a warning at boot when Redis has no TLS or no password | `warnOnInsecureProductionRedis()` in `lib/data/redis.ts` |
| CI fails when a stack variant drops TLS or auth | `checkRedisTlsAndAuth()` in `deploy/bondery/scripts/check-compose.mjs` |

Rotation: see `docs/deploy/secrets.mdx` (delete the files in the `redis-secrets` volume, then recreate `redis-secrets`, `redis`, and `api`).

**Review trigger:** a new Redis client, a new Redis service, a Compose variant, or a change to `createRedisClient()` options. Confirm TLS, certificate verification, and auth are still on.

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
- [ ] Every Redis requires TLS (`rediss://`, verified certificate) and a password; `check-compose.mjs` passes
- [ ] Migrations run via `release-migrate` before app traffic
- [ ] No secrets in committed example files (placeholder values only)
- [ ] Rotation documented in `docs/deploy/secrets.mdx` if applicable
