# Bondery Website

The public marketing website for [bondery.app](https://bondery.app), built with Next.js.

## Development

```bash
npm run dev -w apps/website
```

The dev server starts at `http://localhost:3000`.

## Scripts

| Script | Description |
|---|---|
| `npm run dev -w apps/website` | Start local dev server |
| `npm run build -w apps/website` | Production build |
| `npm run check-types -w apps/website` | TypeScript type check |
| `npm run lint -w apps/website` | ESLint |
| `npm run announce -w apps/website -- --slug <slug>` | Announce a blog post |

## Blog

Blog posts live in `content/blog/`. See [content/blog/GUIDE.md](content/blog/GUIDE.md) for the full authoring guide.

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
| `NEXT_PUBLIC_WEBSITE_URL` | Production website URL, e.g. `https://bondery.app` |
| `PRIVATE_DISCORD_WEBHOOK_URL` | Discord channel webhook URL |
| `REDDIT_CLIENT_ID` | Reddit OAuth2 app client ID (script-type app) |
| `REDDIT_CLIENT_SECRET` | Reddit OAuth2 app client secret |
| `REDDIT_USERNAME` | Reddit account username |
| `REDDIT_PASSWORD` | Reddit account password |

Set these in `.env.local` for local use, or as GitHub Actions secrets for CI.

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
