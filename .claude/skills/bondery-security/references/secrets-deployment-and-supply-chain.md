# Secrets, deployment, and supply chain

Environment contract, self-host hardening, Redis, logging, and dependency security.

## Environment contract (canonical)

`packages/helpers/src/env/manifest.ts` — single source of truth.

| Prefix              | Meaning                        | Client-safe? |
| ------------------- | ------------------------------ | ------------ |
| `BONDERY_PUBLIC_*`  | URLs, feature flags            | Yes          |
| `BONDERY_PRIVATE_*` | Secrets (API, auth, webhooks)  | No           |
| `BONDERY_INFRA_*`   | Deploy / runtime plumbing      | No           |
| `BONDERY_OPS_*`     | CI only — never synced to apps | No           |
| `DATABASE_URL`      | Postgres connection            | No           |

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

| Service         | Secrets                                                          | Network                        |
| --------------- | ---------------------------------------------------------------- | ------------------------------ |
| `api`           | `env_file: .env` (all secrets)                                   | `dokploy-network` + `internal` |
| `webapp`        | Explicit env only (no `env_file`)                                | `dokploy-network`              |
| `db`            | Postgres password                                                | `internal` only                |
| `redis`         | Password (ACL file) + server certificate from `redis-tls-server` | `internal` only                |
| `stack-secrets` | Creates the Redis CA, certificates, and password (one-shot)      | none                           |
| `migrate`       | Same as API                                                      | `internal`                     |

**Policy lint:** `deploy/bondery/scripts/check-compose.mjs`:

- Webapp must not use `env_file` or reference `PRIVATE_*` (except PostHog allowlist)
- Redis/db must not join `dokploy-network` or get Traefik labels
- Redis must require TLS, mutual TLS on the bundled service, and a password in every stack variant, and the API must connect with all three (see [Redis: TLS and authentication](#redis-tls-and-authentication-required))
- API must depend on db healthy + migrate success + redis healthy

**Migrate gate:** `packages/db/scripts/release-migrate.ts` — `prisma migrate deploy` → SQL functions → OAuth client provision. Never runs on `docker compose up` alone.

**Smoke test:** `smoke-bondery-stack.yml` — runtime-config must not leak internal API URL.

## Redis: TLS and authentication (required)

Redis holds session data (Better Auth secondary storage), magic-link and step-up tokens, WebSocket tickets, and rate-limit counters. A private Docker network is not enough protection. **Every Redis that Bondery deploys or connects to must require TLS and authentication.** The bundled Redis also requires a client certificate (`tls-auth-clients yes`). This applies to the bundled Compose Redis, to an external or managed Redis, and to any new Redis instance or stack variant added later. Design record: `docs/adr/0032-redis-mtls.mdx`.

Rules:

1. **TLS only.** Redis serves `--tls-port` and disables the plaintext port (`--port 0`). Clients use `rediss://`. The bundled Redis serves TLS 1.3 only.
2. **Verify the certificate.** Clients trust a CA (`BONDERY_PRIVATE_REDIS_TLS_CA_FILE`) or a publicly trusted certificate. Never set `rejectUnauthorized: false` or skip hostname checks.
3. **Client certificate on the bundled Redis.** Redis sets `--tls-auth-clients yes`. The API and the healthcheck each use a client certificate from the Redis CA. Set `BONDERY_PRIVATE_REDIS_TLS_CERT_FILE` and `BONDERY_PRIVATE_REDIS_TLS_KEY_FILE` as a pair on external Redis when that server requires them.
4. **Authenticate.** Use a strong random password (32+ bytes) through an ACL file or a managed-Redis user. Do not use `requirepass` on the command line, and never set `protected-mode no` on an unauthenticated server.
5. **Secrets in files, not in Compose text.** Pass the password with `BONDERY_PRIVATE_REDIS_PASSWORD_FILE` (volume or Docker secret) or inside `BONDERY_PRIVATE_REDIS_URL` from the secret store. Never commit it, and never put it in an image.
6. **No public exposure.** Redis stays on the private `internal` network. No host `ports:` and no Traefik labels.
7. **Upgrades must stay seamless.** A security change to Redis must not need operator action on existing installs. Generate missing secrets automatically (as the `stack-secrets` job does) and keep existing data.

There is no exception for local development. `deploy/bondery/docker-compose.dev-redis.yml` follows the same rules, so the API's TLS, client certificate, and password path runs on every developer machine. `pnpm run start:redis` creates the secrets in `.temp/redis-secrets` with the same code as the Compose job (`ensure-redis-secrets.ts --local-dev`), and the dev port binds to `127.0.0.1` only.

How the bundled stack does it:

| Part                                                                                                                                                                       | Where                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| CA + server certificate (serverAuth) + API client certificate (clientAuth) + healthcheck client certificate, 10-year leaves, 20-year CA, reissued within 90 days of expiry | `apps/api/src/lib/infra-secrets/redis-tls.ts`, CLI `apps/api/src/cli/ensure-stack-secrets.ts`, Compose service `stack-secrets`   |
| Volumes: `redis-tls-ca` (job), `redis-tls-server` (redis), `redis-tls-client` (api); legacy `redis-secrets` read-only on the job for the first password                    | `deploy/bondery/docker-compose*.yml`                                                                                             |
| Redis stores only the SHA-256 of the password                                                                                                                              | `server/users.acl` in `redis-tls-server`                                                                                         |
| File ownership: `server/` belongs to the Redis user (999), `client/` to the API user (1001), both `0700`                                                                   | `ensureRedisSecrets()`                                                                                                           |
| API reads the password, CA, and client certificate from files                                                                                                              | `apps/api/src/lib/data/redis-connection-options.ts`                                                                              |
| Compose always sets `rediss://${prefix}-redis:6379` plus cert and key paths. A stale `redis://` value in `.env` or Infisical does not apply                                | `deploy/bondery/docker-compose*.yml`                                                                                             |
| Production API logs a warning at boot when Redis has no TLS or no password                                                                                                 | `warnOnInsecureProductionRedis()` in `lib/data/redis.ts`                                                                         |
| CI fails when a stack variant or the dev Redis drops TLS, mutual TLS, or auth, or the dev port leaves loopback                                                             | `checkRedisTlsAndAuth()` and the dev block in `deploy/bondery/scripts/check-compose.mjs`; release smoke `assertRedisMutualTls()` |

Rotation: see `docs/deploy/secrets.mdx` (delete certificate or password files in the `redis-tls-*` volumes, or delete the CA to replace it, then recreate `stack-secrets`, `redis`, and `api`).

**Review trigger:** a new Redis client, a new Redis service, a Compose variant, or a change to `createRedisClient()` options. Confirm TLS, certificate verification, password auth, and that a new client presents the client certificate when the cert and key files are set. Confirm a Compose change keeps `tls-auth-clients yes`.

## Postgres: TLS (required)

Postgres holds the whole product: contacts, notes, sessions, OAuth tokens. **Every connection to it uses TLS that verifies the server, and the bundled Postgres refuses plaintext TCP.** This covers the API pool, pg-boss, the Prisma CLI (`release-migrate`), scripts, tunnelled tools, an external database, and any connection added later. Design record: `docs/adr/0029-postgres-tls.mdx`.

Rules:

1. **One resolver.** Every `pg` Pool or Client and pg-boss is built with `{ ...pgConnectionConfig(url) }` from `@bondery/db`; the Prisma CLI URL comes from `prismaCliUrl(url)`. Never hand-write `ssl` options, `sslmode`, or `enableChannelBinding`.
2. **Verify, by default.** `DATABASE_SSL_MODE` defaults to `verify-full` (CA and hostname). `require` and `disable` are explicit choices for external databases only, and production warns about them on every boot. `prefer`/`allow` are refused. Never `rejectUnauthorized: false` outside the resolver.
3. **No TLS settings in URLs.** `pg` applies URL parameters after explicit options, so a stray `sslmode=disable` turns TLS off. The resolver reads URL TLS parameters as input and strips them; a conflict with `DATABASE_SSL_*` is an error.
4. **Prisma speaks its own dialect.** The schema engine silently ignores libpq's `sslmode=verify-full` and `sslrootcert` (verified: it connected with a wrong CA and hostname). Only `prismaCliUrl` (`sslmode=require&sslaccept=strict&sslcert=<absolute>`) is allowed.
5. **The server enforces it.** `deploy/bondery/postgres/pg_hba.conf` (loaded with `-c hba_file=`, so it also covers old data volumes) allows TCP only as `hostssl` + SCRAM and rejects `hostnossl`. Only the Unix socket is `trust`.
6. **Least privilege for the material.** One volume per consumer: `postgres-tls-ca` (stack-secrets only), `postgres-tls-server` (db, read-only), `postgres-tls-client` (api, read-only, CA certificate only). The key reaches Postgres through a tmpfs copy (`postgres:postgres 0600`).
7. **Seamless upgrades.** `stack-secrets` creates the CA and server certificate when missing and keeps them; existing data volumes need no action.

There is no exception for local development: `docker-compose.dev-db.yml` uses the same wrapper and hba file, and `pnpm run start:postgres` creates the CA in `.temp/postgres-secrets`.

| Part                                                                                                                                                                        | Where                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Private CA (20 y) + server certificate (10 y, SANs `db`, `${prefix}-db`, `localhost`, `127.0.0.1`), reissued 90 days before expiry, on a SAN change, or when the CA changed | `apps/api/src/lib/infra-secrets/postgres-secrets.ts`, `private-ca.ts`, `x509.ts`; CLI `ensure-stack-secrets.ts`                              |
| TLS mode, CA, URL normalization, Prisma URL                                                                                                                                 | `packages/db/src/connection/database-tls.ts`                                                                                                 |
| TLS wrapper (tmpfs key copy, `ssl=on`, TLS 1.2+ with ECDHE AEAD suites, managed hba)                                                                                        | `deploy/bondery/postgres/entrypoint.sh`, `pg_hba.conf`                                                                                       |
| Boot log of the negotiated session, production warning, daily expiry check (warn 90 d, error 14 d)                                                                          | `apps/api/src/lib/data/postgres-tls.ts`, job `tls-certificate-check`                                                                         |
| CI fails when a connection skips the resolver, or a stack variant, dev db, or overlay weakens TLS                                                                           | `check:db-connections` (`apps/api/scripts/db-connections.ts`), `checkPostgresTlsClients()`/`checkPostgresTlsServer()` in `check-compose.mjs` |
| Release smoke: every client backend on TLS 1.2+, plaintext refused, untrusted CA refused                                                                                    | `assertPostgresTls()` in `deploy/bondery/scripts/smoke-release.mjs`                                                                          |

Rotation and CA replacement: `docs/deploy/secrets.mdx#postgres_tls_certificate`.

**Review trigger:** a new database connection of any kind, a new script that talks to Postgres, a Compose variant, a change to `pg_hba.conf` or the wrapper, or an external-database setup. Confirm it goes through the resolver and still verifies the server.

## Object storage: mutual TLS (required)

Object storage holds contact photos and imported files. **The API reaches the S3 gateway over verified HTTPS and presents its own client certificate, Traefik presents a separate one, the gateway accepts only certificates from the storage CA, and the bundled SeaweedFS nodes accept each other only over mutual TLS.** This covers the API's S3 clients, the bucket bootstrap, the gRPC and HTTP traffic between master, volume, filer, and gateway, the public read route, local development, and any S3 client added later. Design record: `docs/adr/0030-object-storage-tls.mdx`; the client certificates were added later in this release.

Rules:

1. **One factory.** Every S3 client in the API comes from `createS3Client()` (`apps/api/src/lib/storage/s3-client.ts`). It trusts the CA in `BONDERY_PRIVATE_S3_TLS_CA_FILE`, presents the pair in `BONDERY_PRIVATE_S3_TLS_CERT_FILE` and `_KEY_FILE` when set, and refuses any of those files with an `http://` endpoint. A half-set pair is an error, never a silent downgrade. Never `new S3Client(` elsewhere, never a hand-built `httpsAgent`, never `rejectUnauthorized: false`.
2. **HTTPS by default.** Compose sets `BONDERY_PRIVATE_S3_ENDPOINT=https://${prefix}-storage:8443` and the CA file in the api `environment:`. An `http://` endpoint is an explicit choice, and production warns about it on every boot.
3. **Mutual TLS inside the cluster.** `deploy/bondery/seaweedfs/security.toml` sets a CA on every gRPC and HTTPS server (client certificates required) and `[https.client] enabled = true`. Set both `[tls] min_version` and `max_version`: with only a minimum, SeaweedFS 4.40 starts gRPC in plaintext and logs only a warning.
4. **Nodes address each other by names the certificate covers.** The volume server runs with `-ip=seaweedfs-volume`; a node registered by container IP fails the hostname check.
5. **Least privilege for the material.** One volume per consumer: `storage-tls-ca` (stack-secrets only), `storage-tls-cluster` (SeaweedFS nodes, read-only), `storage-tls-client` (api, read-only, its CA and its own client certificate), `storage-tls-traefik` (traefik-transport, read-only, its own client certificate). The API key and the Traefik key never share a volume, and the transport job never sees the API key. The key reaches the `seaweed` user through a tmpfs copy (`0600`). The gateway runs as `seaweed`, not root.
6. **The public route is verified HTTPS with a client certificate, reads only, without cookies.** Traefik reaches the gateway on HTTPS `8443` through the published `${prefix}-storage` transport (see Internal API: TLS, rule 5), which carries the CA and Traefik's client certificate as inline data bytes, because Traefik does not mount the Bondery volumes. Better Auth's session cookie is set on the parent domain, so browsers send it to the storage domain: the router matches only `GET`, `HEAD`, and `OPTIONS`, and the `${prefix}-storage-public-read` middleware drops `Cookie` and `Authorization`. A proxy other than Traefik keeps the same rules (`deploy/bondery/proxy/`) and needs its own client certificate. HTTP `8333` is for the healthcheck and local development only; never route to it.

There is no exception for local development: `docker-compose.seaweedfs.dev.yml` keeps `security.toml` and the wrapper, `pnpm run start:seaweedfs` creates the CA and the client certificates in `.temp/storage-secrets`, and HTTPS `8443` is published on `127.0.0.1` only.

| Part                                                                                                                                                                                                               | Where                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Storage CA (20 y) + one cluster certificate (10 y, server and client auth, SANs for every node, `${prefix}-storage`, `localhost`, `127.0.0.1`) + two client certificates (10 y, client auth only: API and Traefik) | `apps/api/src/lib/infra-secrets/storage-secrets.ts`, `private-ca.ts`; CLI `ensure-stack-secrets.ts`  |
| S3 client factory, CA loading, client certificate loading                                                                                                                                                          | `apps/api/src/lib/storage/s3-client.ts`                                                              |
| Node TLS (wrapper, mutual TLS config, HTTPS gateway listener with client certificate verification, TLS healthchecks)                                                                                               | `deploy/bondery/seaweedfs/{tls-entrypoint.sh,security.toml,entrypoint.sh,tls-health.sh,s3-ready.sh}` |
| Traefik transport with the storage CA and Traefik's client certificate                                                                                                                                             | `deploy/bondery/traefik/publish-transports.sh`                                                       |
| Boot log of the TLS session (`tls`, `privateCa`, `mutualTls`), production warning, daily expiry check (warn 90 d, error 14 d)                                                                                      | `apps/api/src/lib/storage/storage-tls.ts`, job `tls-certificate-check`                               |
| CI fails on a hand-built S3 client, or when a stack variant, node, `security.toml`, the transport job, or the dev overlay weakens TLS                                                                              | Biome plugin `biome/plugins/use-s3-client-factory.grit`; `check-compose-storage-tls.mjs`             |
| Release smoke: API reported TLS with the storage CA and its client certificate; the gateway refuses a client without one; nodes refuse plaintext and peers without the cluster certificate; no plaintext gRPC      | `assertStorageTls()` in `deploy/bondery/scripts/smoke-release.mjs`                                   |

Rotation and CA replacement: `docs/deploy/secrets.mdx#storage_tls_certificate`.

**Review trigger:** a new S3 client or script that talks to storage, a SeaweedFS version bump, a new SeaweedFS component (for example a second filer), a change to `security.toml` or the wrapper, or an external-S3 setup. Confirm it goes through the factory and that the running cluster still refuses plaintext.

## Internal API: TLS (required)

Two callers reach the API across the shared `dokploy-network`: Traefik (every public request) and the webapp's server side (rendering, BFF routes, the OAuth token exchange, the JWKS fetch). **The API serves HTTPS only, and every caller verifies it against the API CA.** Design record: `docs/adr/0031-internal-api-tls.mdx`.

Rules:

1. **HTTPS only, one listener.** The API serves HTTPS on `API_PORT` `26631` (TLS 1.3, WebSocket sync included) through Fastify's own `https` option (`buildServer()` with `loadApiTlsOptions()`, `apps/api/src/lib/platform/api-tls.ts`), and does not start without the certificate. There is no plain HTTP port: the container healthcheck calls `https://127.0.0.1:26631` with the API CA. Never add a plain HTTP listener, a second server, or a hand-written proxy, in deployment or in development.
2. **Server-side webapp calls go to `BONDERY_INFRA_INTERNAL_API_URL`.** Compose sets it to `https://${prefix}-api:26631` with `BONDERY_INFRA_INTERNAL_API_CA_FILE`. Resolve it with `resolveServerApiBaseUrl()`; never hard-code an `http://` API URL for a server-side call.
3. **Trust is added once, at startup.** `trustInternalApiCa()` (`apps/webapp/src/lib/platform/internalApiTls.server.ts`, called from `instrumentation.ts`) adds the CA to Node's default trust store. Never pass a per-request `ca`, a custom undici dispatcher, `NODE_TLS_REJECT_UNAUTHORIZED=0`, or `rejectUnauthorized: false` for API calls.
4. **Least privilege for the material.** One volume per consumer: `api-tls-ca` (stack-secrets only), `api-tls-server` (api, read-only, key owned by uid 1001), `api-tls-client` (webapp, the api for its healthcheck, and the transport job; read-only, CA certificate only).
5. **Traefik verifies the API and storage through published transports.** Labels can only reference a `serversTransport`, so the `traefik-transport` job (`deploy/bondery/traefik/publish-transports.sh`) writes `${prefix}-api-transport.yml` and `${prefix}-storage-transport.yml` (CA inline) into the folder Traefik's file provider watches: Dokploy's `/etc/dokploy/traefik/dynamic` by default, or `BONDERY_INFRA_TRAEFIK_DYNAMIC_DIR`. The api labels use `server.scheme=https`, port `26631`, and `serverstransport=${prefix}-api@file`; the `seaweedfs-s3` labels port `8443` and `${prefix}-storage@file`, and that transport also carries Traefik's storage client certificate as inline data bytes, because the gateway requires one. That folder also holds `acme.json` and every route on the host, so the job stays minimal: pinned `busybox`, a reviewed script from git, `network_mode: none`, `cap_drop: ALL`, read-only root filesystem, allow-listed services, files written through a staging file and a rename, and a bind with `create_host_path: false`. Never give that folder to the API image or any other service. Hosts without Traefik use `docker-compose.override.yml.example`, which turns the job off and binds every stack port to `127.0.0.1` for Caddy or nginx (`deploy/bondery/proxy/`, CAs from `deploy/bondery/scripts/api-ca.sh` and `storage-ca.sh`). Those proxies must present a storage client certificate: export it with `storage-ca.sh --client-dir <folder>`, because the gateway refuses a caller without one.

There is no exception for local development: `pnpm run api:secrets` creates the CA in `.temp/api-secrets`, the dev API binds `https://127.0.0.1:26631` (loopback only), `pnpm run setup:dev` points the dev webapp at it, Portless forwards to it with `--upstream https`, and phones reach it through `tailscale serve` (`pnpm run dev:mobile-api`). Portless and `tailscale serve` do not verify the backend certificate; both hops stay on loopback.

| Part                                                                                                                                                                                                            | Where                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| API CA (20 y) + certificate (10 y, SANs `api`, `${prefix}-api`, `localhost`, `127.0.0.1`)                                                                                                                       | `apps/api/src/lib/infra-secrets/api-secrets.ts`, `private-ca.ts`; CLI `ensure-stack-secrets.ts`                                |
| HTTPS-only listener (Fastify `https`), listen address, boot log, daily expiry check                                                                                                                             | `apps/api/src/lib/platform/api-tls.ts`, `build-server.ts`, `main.ts`, job `tls-certificate-check`                              |
| Webapp trust store and production warning                                                                                                                                                                       | `apps/webapp/src/lib/platform/internalApiTls.server.ts`                                                                        |
| CI fails when a stack variant weakens the webapp URL, the CA, the API certificate settings, the Traefik labels, or the transport job hardening                                                                  | `check-compose-api-tls.mjs`; script test `deploy/bondery/scripts/publish-transports.test.mjs`                                  |
| Release smoke: the published transport CA verifies the listener; a webapp route that proxies to the API works; plaintext and untrusted refused; the HTTPS healthcheck is healthy and the port refuses plaintext | `assertTraefikTransport()`, `assertApiInternalTls()`, `assertApiHttpsOnly()` in `deploy/bondery/scripts/smoke-release-tls.mjs` |

Rotation and CA replacement: `docs/deploy/secrets.mdx#api_tls_certificate`.

**Review trigger:** a new server-side call from the webapp (or any other service) to the API, a change to `instrumentation.ts`, a Next.js upgrade that changes how `fetch` or the proxy runs, or a change to the API's listen code. Confirm the call still uses the internal HTTPS URL and the startup trust.

## Redis

| Use               | Path                                                      |
| ----------------- | --------------------------------------------------------- |
| Rate limiting     | `lib/platform/rate-limit.ts` — **required in production** |
| Sync wake pub/sub | `lib/sync/wake/redis-bus.ts`                              |
| WS tickets        | `lib/sync/wake/tickets.ts`                                |

**Gotcha:** `skipOnError: true` on rate limiter — Redis down → limits skipped (degraded security, not fail-closed).

Singleton enforcement: `check-redis-singleton.ts`.

## Logging and observability

- API: Pino via `request.log` / `lib/platform/logger.ts`
- 5xx: full `err` logged server-side; client gets generic message
- Health: `/health/live` (liveness), `/health/ready` (readiness) — readiness rate limited 5 req/min
- Request IDs in error responses

**No centralized log redaction** — see input-storage-and-output.md review trigger.

## Supply chain

| Mechanism                | Present?                                              |
| ------------------------ | ----------------------------------------------------- |
| Biome lint in CI         | Yes (`.github/workflows/verify.yml`)                  |
| Lefthook                 | Yes                                                   |
| Route security scripts   | Yes (`check-route-security`, `check-no-route-writes`) |
| OpenAPI lint             | Yes (`check:openapi`)                                 |
| Compose policy lint      | Yes (`check-compose.mjs`)                             |
| Dependabot               | **No**                                                |
| CodeQL / Snyk / Trivy    | **No**                                                |
| `pnpm audit` in CI       | **No**                                                |
| Container image scanning | **No**                                                |

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
- [ ] Every Redis requires TLS (`rediss://`, verified certificate), a password, and bundled mutual TLS; `check-compose.mjs` passes
- [ ] Migrations run via `release-migrate` before app traffic
- [ ] No secrets in committed example files (placeholder values only)
- [ ] Rotation documented in `docs/deploy/secrets.mdx` if applicable
