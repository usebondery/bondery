# Dokploy pins and env examples

Self-hosters and production should pin **`BONDERY_INFRA_VERSION=X.Y.Z`** (not floating `:production`, never an RC string) so api and webapp move together. RC tags exist on GHCR but are **not** a self-host channel.

## Version pin source

`BONDERY_INFRA_VERSION` in [`deploy/bondery/.env.example`](../../../../deploy/bondery/.env.example) is generated from the **last production CalVer** — root `package.json` when that version is clean `X.Y.Z`, or the previous production git tag while the repo is on `X.Y.Z-rc.N`. It is not a duplicate field in [`packages/helpers/src/env/manifest.ts`](../../../../packages/helpers/src/env/manifest.ts).

Run `pnpm run sync-version` on release prep — it propagates the root version to workspace packages and mobile native fields, writes `MIN_EXTENSION_VERSION`, then runs `env:sync` to regenerate examples without writing RC into `.env.example`.

For the marketing website ops stack, set `opsExample.value` on:

- `BONDERY_INFRA_WEBSITE_IMAGE_TAG`

## Regenerate deploy examples

```bash
pnpm run sync-version
# or after manifest / version edits:
pnpm run env:sync
```

[`deploy/bondery/.env.example`](../../../../deploy/bondery/.env.example) includes:

```env
# BONDERY_INFRA_VERSION=X.Y.Z
```

[`deploy/ops/.env.example`](../../../../deploy/ops/.env.example) may include:

```env
# BONDERY_INFRA_WEBSITE_IMAGE_TAG=X.Y.Z
```

## Dokploy redeploy

| Stack | Compose path | Dokploy app |
|-------|--------------|-------------|
| Product (api + webapp) | `deploy/bondery` | Services webhook target |
| Marketing website | `deploy/ops` | Ops webhook target |

On Dokploy product Compose:

1. Set `BONDERY_INFRA_VERSION=X.Y.Z` in app env (pins both container images).
2. Save env and redeploy **api + webapp together**:

```bash
docker compose up -d api webapp
```

Do not roll back or upgrade api/webapp independently in production.

Website is a separate Dokploy app (`deploy/ops`). Omit `BONDERY_INFRA_WEBSITE_IMAGE_TAG` for floating `:production`, or pin for rollback.

Staging may pin `:beta` or a named RC (`1.9.1-rc.1`). `:beta` moves only on named RC cuts, not every merge to `main`.

## Record rollback version

Before changing pins, note the previous `BONDERY_INFRA_VERSION` in the PR or release notes. For website, note the previous `BONDERY_INFRA_WEBSITE_IMAGE_TAG` (or `:production`). See [rollback-hotfix.md](rollback-hotfix.md).

## Pins checklist

- [ ] `BONDERY_INFRA_VERSION` is production CalVer that passed CI smoke — never `X.Y.Z-rc.N`
- [ ] `pnpm run sync-version` (or `env:sync`) run after manifest or version edit
- [ ] `deploy/bondery/.env.example` committed
- [ ] Dokploy product env updated
- [ ] api + webapp redeployed together
