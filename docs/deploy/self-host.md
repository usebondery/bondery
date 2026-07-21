# Self-host Bondery (bundled Supabase)

Run the full product stack on your own VPS: **api + webapp + redis + Supabase** via a single Compose entrypoint.

Docs: [dokploy.md](./dokploy.md) · [deploy/bondery/README.md](../../deploy/bondery)

## Requirements

| Profile | RAM | CPU | Disk |
|---------|-----|-----|------|
| Floor | 6–8 GB | 2 cores | 40 GB SSD |
| **Recommended** | **8–10 GB** | 4 cores | 80 GB SSD |
| Comfortable prod | 12–16 GB | 4 cores | 100 GB+ SSD |

[Supabase self-host docs](https://supabase.com/docs/guides/self-hosting/docker) recommend 4 GB minimum / 8 GB+ for Supabase alone; add ~1–2 GB for Bondery apps.

Also needed: Docker + Compose v2, a domain with DNS for api / app / supabase (and optional website), Traefik (Dokploy) or host-port override.

## Layout

```
deploy/bondery/
  docker-compose.yml              # Dokploy entrypoint (include + api/webapp/redis)
  docker-compose.supabase.yml     # Vendored Supabase fragment
  versions.supabase.lock          # Pinned upstream images
  supabase/volumes/               # Kong + Postgres init scripts
  .env.example
```

Dokploy and CLI both use **`deploy/bondery/docker-compose.yml`** — no wrapper scripts.

## Quick start (greenfield)

```bash
docker network create dokploy-network   # once

cd deploy/bondery
cp .env.example .env
# Fill domains, generate secrets (see below), OAuth client IDs

docker compose up -d

# Publish Postgres for migrations (host-port mode) if not using Traefik-only:
cp docker-compose.override.yml.example docker-compose.override.yml
docker compose up -d db

# From repo root — apply migrations + vault + storage buckets
npm run stack:bootstrap:greenfield -w supabase-db
```

Without Traefik (laptop / smoke):

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
docker compose up -d
curl -sf http://localhost:26631/status
curl -sf http://localhost:26632/api/live
curl -sf http://localhost:8000/auth/v1/health
```

Studio (optional admin UI, not Traefik):

```bash
docker compose --profile studio up -d studio
# Then SSH tunnel or Dokploy port-forward to studio:3000
```

## Secrets

Operators use **`BONDERY_*` only**. Compose maps them into GoTrue / Kong / Postgres internals.

Set `BONDERY_PRIVATE_SUPABASE_JWT_SECRET`, `BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_*`), `BONDERY_PRIVATE_SUPABASE_SECRET_KEY` (`sb_secret_*`), and `BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK` (export ES256 private JWK from Supabase Cloud on cutover).

**Once at setup** (or when rotating signing JWK / JWT secret), derive Auth JWKS + Kong asymmetric JWT env and paste into Dokploy / `.env`:

```bash
cd deploy/bondery
export BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK='{"kty":"EC",...}'   # compact single-line JSON
export BONDERY_PRIVATE_SUPABASE_JWT_SECRET='your-jwt-secret'
node supabase/volumes/scripts/derive-jwt-env.mjs --print
```

Copy the four `BONDERY_SUPABASE_*` lines into your environment. Re-run only after key rotation.

After rotating signing JWK or JWT secret:

```bash
cd deploy/bondery
# Re-derive (see above), update .env / Dokploy, then:
docker compose up -d --force-recreate auth rest realtime storage kong
```

| Operator var | Purpose |
|--------------|---------|
| `BONDERY_PRIVATE_SUPABASE_JWT_SECRET` | HS256 secret (legacy sessions + symmetric JWKS entry) |
| `BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_*` opaque key |
| `BONDERY_PRIVATE_SUPABASE_SECRET_KEY` | `sb_secret_*` opaque key |
| `BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK` | ES256 private JWK (API-key minting + Auth signing) |
| `BONDERY_SUPABASE_GOTRUE_JWT_KEYS` | GoTrue signing keyset (derive once via `derive-jwt-env.mjs --print`) |
| `BONDERY_SUPABASE_JWT_JWKS` | JWKS for PostgREST / Realtime / Storage verification |
| `BONDERY_SUPABASE_ANON_KEY_ASYMMETRIC` | ES256 anon JWT for Kong `sb_publishable_*` translation |
| `BONDERY_SUPABASE_SERVICE_ROLE_KEY_ASYMMETRIC` | ES256 service_role JWT for Kong `sb_secret_*` translation |
| `BONDERY_PRIVATE_POSTGRES_PASSWORD` | Postgres password |
| `BONDERY_PRIVATE_SUPABASE_SECRET_KEY_BASE` | Realtime encrypt key (≥64 chars) |
| `BONDERY_PRIVATE_SUPABASE_PG_META_CRYPTO_KEY` | Studio/meta crypto (≥32 chars) |
| `BONDERY_PRIVATE_SUPABASE_DASHBOARD_PASSWORD` | Kong Studio basic-auth |

`BONDERY_PUBLIC_SUPABASE_URL` is **derived** from `BONDERY_INFRA_SUPABASE_DOMAIN` — do not set it in `.env`.

API uses `BONDERY_INFRA_INTERNAL_SUPABASE_URL=http://kong:8000` (set in compose) for server-side clients; browsers still use the public HTTPS URL.

## OAuth

1. Set `BONDERY_SUPABASE_AUTH_EXTERNAL_GITHUB_*` and `BONDERY_SUPABASE_AUTH_EXTERNAL_LINKEDIN_*`.
2. In GitHub / LinkedIn apps, callback URL:

   `https://<BONDERY_INFRA_SUPABASE_DOMAIN>/auth/v1/callback`

3. Set `BONDERY_SUPABASE_ADDITIONAL_REDIRECT_URLS` to webapp/site callbacks + mobile deep links.
4. Set `BONDERY_INFRA_CHROME_EXTENSION_ID` — Compose appends `https://{id}.chromiumapp.org/` (and without trailing slash) to the Auth allow-list.

## Bootstrap commands

| Command | When |
|---------|------|
| `npm run stack:bootstrap:greenfield -w supabase-db` | Empty DB: migrations + vault + buckets |
| `npm run stack:bootstrap:import -w supabase-db` | After restoring a cloud dump: vault only (**no migrations**) |

## Health gate

Before opening traffic:

```bash
curl -sf https://api.example.com/health
curl -sf https://app.example.com/api/ready
```

Manual: OAuth login, API key auth, avatar upload, reminder dispatch (`pg_cron`).

## Migrate from Supabase Cloud → self-host

See [Cutover runbook](#cutover-runbook-cloud--self-host) below.

## Storage migration (cloud → self-host)

```bash
SOURCE_SUPABASE_URL=https://xxxx.supabase.co \
SOURCE_SERVICE_ROLE_KEY=... \
DEST_SUPABASE_URL=https://supabase.example.com \
DEST_SERVICE_ROLE_KEY=... \
npm run stack:migrate-storage -w supabase-db
```

Copies `avatars` and `linkedin_logos` (override with `BUCKETS=`). Verify object counts match before cutover.

## Schema migrations after go-live

**Migrations never run automatically** when you `docker compose up` or redeploy Dokploy. Compose only starts containers; SQL in `apps/supabase-db/supabase/migrations/` is applied separately.

| Scenario | What to run |
|----------|-------------|
| **Greenfield** (empty Postgres) | `npm run stack:bootstrap:greenfield -w supabase-db` — runs `supabase db push` + vault + buckets |
| **Cloud import** (restored dump) | **Do not** run greenfield bootstrap — schema came with the dump. Use `stack:bootstrap:import` for vault only |
| **Each release** with new SQL | `supabase db push` against production Postgres (see below) |

After releasing migrations:

```bash
# Expose db on host port 54322 (docker-compose.override.yml), then:
npx supabase db push --db-url "postgresql://postgres:$BONDERY_PRIVATE_POSTGRES_PASSWORD@127.0.0.1:54322/postgres"
```

Or from the VPS with `docker compose exec` and a one-off connection. Then redeploy api/webapp if application code changed (schema-only migrations usually need no app redeploy).

## Upgrades

1. Bump image pins in `versions.supabase.lock` + `docker-compose.supabase.yml` from a tested [supabase/docker](https://github.com/supabase/supabase/tree/master/docker) tag.
2. Test on staging.
3. Redeploy Dokploy compose app.
4. Apply new SQL migrations from `apps/supabase-db` with `supabase db push` (manual — not automatic on compose up).

## Backups

| Data | How |
|------|-----|
| Postgres | `docker compose exec -T db pg_dump -U postgres postgres > backup-$(date +%F).sql` |
| Storage files | Named volume `supabase-storage-data` — snapshot with `docker run --rm -v deploy_bondery_supabase-storage-data:/data -v "$(pwd)":/out alpine tar czf /out/storage.tgz -C /data .` (adjust volume name via `docker volume ls`) |
| Redis | Volume `redis-data` (AOF enabled in compose) |

Restore checklist:

1. Stop `api` and `webapp`.
2. Restore dump into `db` (`psql` via `docker compose exec -T db`).
3. Restore storage volume archive if needed.
4. `npm run stack:bootstrap:import -w supabase-db`.
5. Start apps; verify `/health` and `/api/ready`.

Schedule daily dumps off-box (S3, rclone, or Dokploy backup jobs). Keep at least one restore rehearsal per quarter.

## Cutover runbook (cloud → self-host)

**Audience:** Bondery production (or any existing hosted Supabase project).

### T-7 days

1. Provision VPS (≥8 GB recommended) and Dokploy compose app pointing at `deploy/bondery/docker-compose.yml`.
2. DNS: `BONDERY_INFRA_SUPABASE_DOMAIN` → VPS.
3. Add OAuth callback `https://<supabase-domain>/auth/v1/callback` (keep old cloud callback until cutover).
4. Export from cloud:
   - Publishable + service role keys
   - JWT signing JWK → `BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK`
   - OAuth client secrets
5. Mobile / extension: plan rebuild if Supabase URL is baked at build time (`BONDERY_PUBLIC_SUPABASE_URL`).

### Staging rehearsal (required)

1. `docker compose up -d` with **imported** cloud JWT/keys in `.env` (same publishable + service role + JWT secret as cloud).
2. Dump cloud (example):

   ```bash
   # From a machine with network access to cloud Postgres (Supabase dashboard connection string)
   pg_dump "$CLOUD_DATABASE_URL" \
     --format=custom --no-owner --no-acl \
     -n public -n auth -n storage -n vault \
     -f cloud.dump
   ```

3. Restore into self-hosted `db` (publish `54322` via override, or `docker compose exec`):

   ```bash
   pg_restore --clean --if-exists --no-owner --no-acl \
     -d "postgresql://postgres:$BONDERY_PRIVATE_POSTGRES_PASSWORD@127.0.0.1:54322/postgres" \
     cloud.dump
   ```

4. Sync storage: `npm run stack:migrate-storage -w supabase-db` (see [Storage migration](#storage-migration-cloud--self-host)).
5. `npm run stack:bootstrap:import -w supabase-db` (vault only — **no migrations**).
6. Pass health gate + OAuth / API key / avatar / realtime / reminder (`pg_cron`) checks.

### T-0 (maintenance window, ~30–90 min)

1. Announce maintenance; freeze writes on cloud if possible.
2. Final `pg_dump` + `stack:migrate-storage`.
3. Restore into self-hosted `db` + confirm storage object counts.
4. `npm run stack:bootstrap:import -w supabase-db`.
5. Verify `/health` and `/api/ready`.
6. Open traffic.

### Rollback

1. Point `.env` / Dokploy env at cloud `BONDERY_PUBLIC_SUPABASE_URL` (override derived URL by temporarily setting public URL on api/webapp if needed — prefer keeping cloud project live 7 days).
2. Redeploy **api + webapp only** (leave self-hosted Postgres stopped or unused).
3. Revert OAuth callbacks if required.

### After 48h

Decommission cloud project only after doctor-equivalent health checks stay green and mobile clients are updated.
