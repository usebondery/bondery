# Bondery stack (webapp + API + Redis)

Canonical Docker Compose distribution for **self-hosters** and **Bondery production** (Dokploy).

The marketing website is **not** in this stack — see [`deploy/ops`](../ops/) (Bondery production only). This folder still uses `BONDERY_INFRA_WEBSITE_DOMAIN` so api/webapp can derive `BONDERY_PUBLIC_WEBSITE_URL`.

Local development Redis is **[`apps/redis`](../../apps/redis/)** (`npm run start -w redis`, port 26636) — not this folder.

Docs: [docs/deploy/dokploy.md](../../docs/deploy/dokploy.md) · [docs/deploy/api-container.md](../../docs/deploy/api-container.md)

## Quick start

```bash
# One-time: shared Traefik network (Dokploy creates this; self-hosters create it once)
docker network create dokploy-network

cd deploy/bondery
cp .env.example .env
# Fill secrets (default image tags are floating "production")
docker compose up -d
```

Without Traefik (host ports):

```bash
cp docker-compose.override.yml.example docker-compose.override.yml
docker compose up -d
curl -s http://localhost:26631/status
curl -s http://localhost:26632/api/live
```

### Services

| Service | Image | Port | Notes |
|---------|-------|------|--------|
| `webapp` | `ghcr.io/usebondery/webapp:${BONDERY_INFRA_WEBAPP_IMAGE_TAG}` | 26632 | Liveness `/api/live` — does **not** depend on API |
| `api` | `ghcr.io/usebondery/api:${BONDERY_INFRA_API_IMAGE_TAG}` | 26631 | Waits for Redis healthy |
| `redis` | `redis:7.4-alpine` | internal only | AOF + volume `redis-data`; never expose |

### Networking

- `webapp` + `api` join external `dokploy-network` and carry Traefik labels (`BONDERY_INFRA_WEBAPP_DOMAIN` / `BONDERY_INFRA_API_DOMAIN`).
- `redis` joins only the private `internal` network with `api` — never Traefik, never host ports.
- Set hostnames (`BONDERY_INFRA_API_DOMAIN`, `BONDERY_INFRA_WEBAPP_DOMAIN`, `BONDERY_INFRA_WEBSITE_DOMAIN`); Compose derives `https://…` for apps and Traefik `Host()` rules.
- Webapp SSR/BFF uses `BONDERY_INFRA_INTERNAL_API_URL=http://api:26631` (set in compose).

### Upgrades / rollback

```bash
# Upgrade only webapp (API + Redis stay up)
BONDERY_INFRA_WEBAPP_IMAGE_TAG=1.7.3 docker compose up -d --no-deps webapp

# Upgrade only API
BONDERY_INFRA_API_IMAGE_TAG=1.7.3 docker compose up -d --no-deps api

# Rollback: set previous pins in .env and redeploy the changed service
```

Update the pins in `.env.example` when releasing a tested stack pair.

### Image tags

- **`production` (default):** floating channel — redeploy pulls the latest release image (`pull_policy: always` on `api` / `webapp`).
- **Semver (`1.7.3`):** pin when you want a frozen version and one-command rollback to a known tag.
- API and webapp are published independently; keep both on the same channel (or a tested semver pair) to avoid a partial upgrade.

## Advanced: external Redis

1. Do **not** start this compose Redis (or omit compose entirely).
2. Run `ghcr.io/usebondery/api:<semver>` alone with your secrets.
3. Set `BONDERY_PRIVATE_REDIS_URL` to your managed Redis (`rediss://…` when TLS is required).

Empty `BONDERY_PRIVATE_REDIS_URL` is **invalid in production**.

## Security

- Never expose Redis to the public internet.
- API secrets (`BONDERY_PRIVATE_*`) load only into the `api` service (`env_file`). Webapp receives an explicit allowlist of `BONDERY_PUBLIC_*`, optional `BONDERY_PRIVATE_POSTHOG_*` for server-side capture, and infra metadata — not the full API secret set.
- JWT signing JWK must be **compact single-line JSON** in `.env`.
