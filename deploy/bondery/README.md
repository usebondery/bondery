# Bondery stack (webapp + API + Redis + Supabase)

Canonical Docker Compose distribution for **self-hosters** and **Bondery production** (Dokploy).

The marketing website is **not** in this stack — see [`deploy/ops`](../ops/) (Bondery production only). This folder still uses `BONDERY_INFRA_WEBSITE_DOMAIN` so api/webapp can derive `BONDERY_PUBLIC_WEBSITE_URL`.

Local development:

- Redis: **[`apps/redis`](../../apps/redis/)** (`npm run start -w redis`, port 26636)
- Supabase: **[`apps/supabase-db`](../../apps/supabase-db/)** (`npm run start -w supabase-db`) — not this Compose file

Docs: [docs/deploy/self-host.md](../../docs/deploy/self-host.md) · [docs/deploy/dokploy.md](../../docs/deploy/dokploy.md) · [docs/deploy/api-container.md](../../docs/deploy/api-container.md)

## Quick start

```bash
# One-time: shared Traefik network (Dokploy creates this; self-hosters create it once)
docker network create dokploy-network

cd deploy/bondery
cp .env.example .env
# Fill domains + secrets (see docs/deploy/self-host.md)
docker compose up -d

# First boot only — empty database
npm run stack:bootstrap:greenfield -w supabase-db
```

Without Traefik (host ports):

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
docker compose up -d
curl -s http://localhost:26631/status
curl -s http://localhost:26632/api/live
curl -s http://localhost:8000/auth/v1/health
```

### Services

| Service | Image | Port | Notes |
|---------|-------|------|--------|
| `webapp` | `ghcr.io/usebondery/webapp` | 26632 | Liveness `/api/live` |
| `api` | `ghcr.io/usebondery/api` | 26631 | Waits for Redis + Kong healthy |
| `redis` | `redis:7.4-alpine` | internal | AOF + volume `redis-data` |
| `kong` | Kong gateway | 8000 (Traefik) | Public Supabase API (`BONDERY_INFRA_SUPABASE_DOMAIN`) |
| `db` | `supabase/postgres:17` | internal | Named volume `supabase-db-data` |
| `auth`, `rest`, `realtime`, `storage`, `imgproxy`, `meta` | Supabase | internal | See `docker-compose.supabase.yml` |
| `studio` | Supabase Studio | profile `studio` | Off by default |

Compose entrypoint: **`docker-compose.yml`** includes **`docker-compose.supabase.yml`**. Dokploy points at this path only.

### Networking

- `webapp` + `api` + `kong` join external `dokploy-network` (Traefik).
- Supabase data-plane services + `redis` join private `internal` only (except `kong`, which also joins Traefik).
- Set hostnames (`BONDERY_INFRA_*_DOMAIN`); Compose derives `https://…` URLs.
- Webapp SSR uses `BONDERY_INFRA_INTERNAL_API_URL=http://api:26631`.
- API uses `BONDERY_INFRA_INTERNAL_SUPABASE_URL=http://kong:8000`.

### Upgrades / rollback

```bash
# Upgrade only webapp (API + Redis + Supabase stay up)
BONDERY_INFRA_WEBAPP_IMAGE_TAG=1.7.3 docker compose up -d --no-deps webapp

# Upgrade only API
BONDERY_INFRA_API_IMAGE_TAG=1.7.3 docker compose up -d --no-deps api
```

Supabase image bumps: edit `docker-compose.supabase.yml` + `versions.supabase.lock`, test on staging.

### Image tags (api / webapp)

- **`production` (default):** floating channel (`pull_policy: always`).
- **Semver:** pin for frozen rollback.

## Advanced: external Redis

1. Do **not** start this compose Redis (or omit compose entirely).
2. Run `ghcr.io/usebondery/api:<semver>` alone with your secrets.
3. Set `BONDERY_PRIVATE_REDIS_URL` to your managed Redis (`rediss://…` when TLS is required).

## Security

- Never expose Redis or Postgres to the public internet.
- API secrets (`BONDERY_PRIVATE_*`) load only into the `api` service (`env_file`). Webapp receives an explicit allowlist.
- JWT signing JWK must be **compact single-line JSON** in `.env`.
- Studio is opt-in (`docker compose --profile studio up -d studio`) — do not put it on Traefik in production.
