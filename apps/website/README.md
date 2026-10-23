# Bondery Website

The public marketing website for [bondery.app](https://bondery.app), built with Next.js.

## Development

Default local URLs use [Portless](https://github.com/vercel-labs/portless) HTTPS:

| App | URL |
|---|---|
| website | `https://usebondery.test` |
| webapp | `https://app.usebondery.test` |
| api | `https://api.usebondery.test` |

```bash
# From repo root (preferred)
pnpm --filter website run dev

# Or from apps/website
pnpm run dev
```

Do not run `pnpm run dev -w website`. pnpm forwards `-w website` into the script; Next then fails with `unknown option '-w'`.

### First-time Portless setup

1. **Install** — `portless` is a local `devDependency` of `website` / `webapp` / `api`. Hostnames and ports live in each app’s `"portless"` key (and root [`portless.json`](../../portless.json) when Portless runs from the monorepo root). From the repo root, run `pnpm install` if needed. Do not install Portless globally.
2. **Trust the local CA (first run)** — from `apps/website`, run `pnpm exec portless trust`.
3. **Windows hosts (required once)** — Windows does not auto-resolve `*.usebondery.test`. Open an **elevated** PowerShell, `cd` to `apps/website`, then either:
   - run `pnpm run dev` once so Portless can write hosts, or
   - after a failed start: `pnpm exec portless hosts sync`
   Without Admin, Portless logs `Could not write hosts file` and the name will not resolve.
4. **Env** — local examples use Portless URLs. Sync with `pnpm run env:development` after updating root `.env.local`, or copy from `.env.development.local.example`.
5. **OAuth consoles** — register Portless callbacks on the API host, e.g. `https://api.usebondery.test/auth/callback/github` (and `/linkedin`). Keep classic `http://localhost:26631/auth/callback/...` as an escape hatch if you use `dev:classic`.
6. **If the proxy timed out** — `pnpm exec portless proxy start --foreground` or `pnpm exec portless doctor`, then retry.
7. **Open** — `https://usebondery.test`

`dev` sets `PORTLESS_TLD=test`. Mailpit UI (after `pnpm run start:mailpit` from the repo root): `https://mail.usebondery.test`.

### Migrate from `*.usebondery.localhost`

1. Stop the old proxy: `pnpm exec portless proxy stop`.
2. Start with `pnpm run dev` (`PORTLESS_TLD=test`).
3. On Windows, run elevated `pnpm exec portless hosts sync`.
4. Clear stale `*.usebondery.localhost` hosts entries if they remain.
5. Keep `pnpm exec portless trust` (do not re-trust unless the CA is missing).
6. Point OAuth callbacks at `https://api.usebondery.test/auth/callback/...`.

**HSTS note:** `next.config.ts` sends Strict-Transport-Security. After you visit the Portless HTTPS host, the browser may keep requiring HTTPS for that hostname until you clear HSTS for it.

### Classic localhost (escape hatch)

HTTP on raw ports without Portless:

```bash
pnpm --filter website run dev:classic
```

Use matching classic URLs in env (`http://localhost:26630` / `26631` / `26632`) and classic OAuth callbacks.

## Scripts

| Script | Description |
|---|---|
| `pnpm --filter website run dev` | Start Portless HTTPS dev server |
| `pnpm --filter website run dev:classic` | Start classic `localhost` HTTP dev server |
| `pnpm exec turbo build --filter=website` | Production build (from repo root) |
| `pnpm --filter website run check:types` | TypeScript type check |
| `pnpm run lint` (repo root) | Biome format (write fixes) |
| `pnpm --filter website run announce -- --slug <slug>` | Announce a blog post |

## Blog

Blog posts live in `content/blog/`. See the [Blog Writing Guide](../../.agents/workflows/blog/WRITING-GUIDE.md) for the full authoring guide.

### Quick summary

Each post consists of two files:

- `content/blog/<category>/<slug>.meta.ts` — post metadata as plain TypeScript
- `content/blog/<category>/<slug>.mdx` — content (re-exports `postMeta` from the sidecar)

After writing a post, register it in:
- `content/blog/posts.ts` — for the Next.js app (MDX component + metadata)
- `content/blog/metadata.ts` — for the announce script (metadata only)

## Announcement pipeline

The announce script posts a new blog entry to **Discord** and **Reddit** using the post's `announce` metadata field.

### Environment variables

| Variable | Description |
|---|---|
| `BONDERY_PUBLIC_WEBSITE_URL` | Production website URL, e.g. `https://bondery.app` |
| `BONDERY_OPS_DISCORD_WEBHOOK_URL` | Discord channel webhook URL |
| `BONDERY_OPS_REDDIT_CLIENT_ID` | Reddit OAuth2 app client ID (script-type app) |
| `BONDERY_OPS_REDDIT_CLIENT_SECRET` | Reddit OAuth2 app client secret |
| `BONDERY_OPS_REDDIT_USERNAME` | Reddit account username |
| `BONDERY_OPS_REDDIT_PASSWORD` | Reddit account password |

Set product URLs in the app `.env.development.local` / production local (via `pnpm run env`), or as GitHub Actions secrets for CI. Announce loads env with `@next/env` `loadEnvConfig`.

### Enabling a post for announcement

In the post's `.meta.ts` file, set `announce.enabled = true`:

```ts
announce: {
  enabled: true,
  subreddit: "bondery",                          // default, can be omitted
  redditTitle: "Custom Reddit title if needed",  // optional
},
```

### Running locally

```bash
# Dry run — logs payloads without sending
pnpm --filter website run announce -- --slug introducing-bondery --dry-run

# Real run
pnpm --filter website run announce -- --slug introducing-bondery

# Post to Discord only
pnpm --filter website run announce -- --slug introducing-bondery --discord-only

# Post to Reddit only
pnpm --filter website run announce -- --slug introducing-bondery --reddit-only

# Force-announce even if announce.enabled = false
pnpm --filter website run announce -- --slug introducing-bondery --force
```

### GitHub Actions

Two trigger modes are available in `.github/workflows/announce-blog-post.yml`:

**Manual** (`workflow_dispatch`): provide a slug and optional dry-run flag via the GitHub Actions UI.

**Automatic** (on push to `main`): when a new `.mdx` file is added to `content/blog/`, the workflow detects the slug and announces it automatically. This is gated by the `AUTO_ANNOUNCE_ENABLED` repository variable — set it to `"true"` in your repository settings to enable.
