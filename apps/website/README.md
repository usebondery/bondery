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

1. **Install** — `portless` is a devDependency of the **workspace root**, because no app runs the Portless wrapper. `scripts/dev/portless-alias.mjs` calls that copy directly. Hostnames and ports come from `DEV_URLS` / `DEV_PORTS` in `@bondery/schemas/constants/dev-ports`. From the repo root, run `pnpm install` if needed. Do not install Portless globally.
2. **Trust the local CA (first run)** — from the repo root, run `pnpm exec portless trust`.
3. **Windows hosts (required once)** — Windows does not auto-resolve `*.usebondery.test`. Open an **elevated** PowerShell, then from the repo root run:
   - `pnpm exec portless hosts sync` to write the hosts file.
   Without Admin, Portless logs `Failed to update hosts file` and the names will not resolve in the browser.
4. **Env** — local examples use Portless URLs. Sync with `pnpm run env:development` after updating root `.env.local`, or copy from `.env.development.local.example`.
5. **OAuth consoles** — register Portless callbacks on the API host, e.g. `https://api.usebondery.test/auth/callback/github` (and `/linkedin`). Keep classic `http://localhost:26631/auth/callback/...` as an escape hatch if you use `dev:classic`.
6. **If the proxy timed out** — `pnpm exec portless proxy start --foreground` or `pnpm exec portless doctor`, then retry.
7. **Open** — `https://usebondery.test`

`dev` registers the `usebondery.test` alias, then runs `next dev` on `26630`. Mailpit UI (after `pnpm run start:mailpit` from the repo root): `https://mail.usebondery.test`.

Aliases are static (`pid 0` in `~/.portless/routes.json`), so they stay registered after a dev server stops. The hosts file only needs one write per hostname.

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
