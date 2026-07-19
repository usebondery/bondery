# API + Redis (production / self-host)

Canonical Docker Compose stack for the Bondery API and Redis.

| Path | When | How |
|------|------|-----|
| **A (default)** | Self-hosters and Dokploy | This compose file — API + Redis |
| **B** | You already have Redis | Run the API image alone + custom `PRIVATE_REDIS_URL` |

Local development Redis is **[`apps/redis`](../../apps/redis/)** (`npm run start -w redis`, port 26636) — not this folder.

Full deploy docs: [docs/deploy/api-container.md](../../docs/deploy/api-container.md).

## Path A — quick start

```bash
cd deploy/api
cp .env.example .env
# Fill secrets from apps/api/.env.production.example
docker compose up -d
curl -s http://localhost:26631/health
# expect services.redis.configured=true and services.redis.ok=true
```

Defaults:

- Image: `ghcr.io/usebondery/api:${API_IMAGE_TAG:-production}`
- Redis URL: `redis://redis:6379` (Docker DNS service name)
- Redis: private network only (no host port), AOF + volume `redis-data`
- API waits until Redis is healthy before starting

Stop:

```bash
docker compose down
```

## Path B — external Redis

1. Do **not** start this compose stack’s Redis (or omit compose entirely).
2. Run the API container / Dokploy **Docker Image** provider with your secrets.
3. Set `PRIVATE_REDIS_URL` to your managed or existing Redis (e.g. `rediss://:token@host:6379`).

Empty `PRIVATE_REDIS_URL` is **invalid in production**.

## Security

- Publish only the API port (`26631`) or attach Traefik to the `api` service.
- Never expose the Redis container to the public internet.
