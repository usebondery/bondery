# Bondery Website

The public marketing website for [bondery.app](https://bondery.app), built with Next.js.

## Development

```bash
npm run dev -w apps/website
```

The dev server starts at `http://localhost:26630`.

## Scripts

| Script | Description |
|---|---|
| `npm run dev -w apps/website` | Start local dev server |
| `npx turbo build --filter=website` | Production build (from repo root) |
| `npm run check-types -w apps/website` | TypeScript type check |
| `npm run lint` (repo root) | Biome format (write fixes) |
| `npm run announce -w apps/website -- --slug <slug>` | Announce a blog post |

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

Set product URLs in the app `.env.development.local` / production local (via `npm run env`), or as GitHub Actions secrets for CI. Announce loads env with `@next/env` `loadEnvConfig`.

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
npm run announce -w apps/website -- --slug introducing-bondery --dry-run

# Real run
npm run announce -w apps/website -- --slug introducing-bondery

# Post to Discord only
npm run announce -w apps/website -- --slug introducing-bondery --discord-only

# Post to Reddit only
npm run announce -w apps/website -- --slug introducing-bondery --reddit-only

# Force-announce even if announce.enabled = false
npm run announce -w apps/website -- --slug introducing-bondery --force
```

### GitHub Actions

Two trigger modes are available in `.github/workflows/announce-blog-post.yml`:

**Manual** (`workflow_dispatch`): provide a slug and optional dry-run flag via the GitHub Actions UI.

**Automatic** (on push to `main`): when a new `.mdx` file is added to `content/blog/`, the workflow detects the slug and announces it automatically. This is gated by the `AUTO_ANNOUNCE_ENABLED` repository variable — set it to `"true"` in your repository settings to enable.
