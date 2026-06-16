---
name: Blog Post Workflow
description: End-to-end process for writing, publishing, and announcing a blog post.
triggers:
  - monthly release (after technical deploy succeeds)
  - standalone blog posts (features, guides, announcements)
depends_on:
  - RELEASE.md (for monthly release posts)
related:
  - blog/WRITING-GUIDE.md
---

# Blog Post Workflow

This workflow covers writing a blog post, registering it in the codebase, deploying it, and announcing it on Discord and Reddit.

For **writing style, structure, SEO, and content guidelines**, see [WRITING-GUIDE.md](WRITING-GUIDE.md).

---

## 1. Write the Post

### Create the files

Each post requires two files in `apps/website/content/blog/<category>/`:

| File | Purpose |
|------|---------|
| `<slug>.meta.ts` | Post metadata as plain TypeScript (title, date, description, announce config) |
| `<slug>.mdx` | Content in MDX format; re-exports `postMeta` from the sidecar |

Use the quick-start template in [WRITING-GUIDE.md](WRITING-GUIDE.md#7-quick-start-template).

### Set announce metadata

If this post should be announced on Discord and/or Reddit, set the `announce` field in the `.meta.ts` file:

```ts
announce: {
  enabled: true,              // required for any announcement
  // discord: true,           // default: true
  // reddit: true,            // default: true
  // subreddit: "bondery",    // default: "bondery"
  // redditTitle: "...",      // override post title for Reddit
  // redditFlair: "...",      // optional flair text
},
```

### Register the post

Add the post to **both** registry files (newest first):

1. `apps/website/content/blog/posts.ts` — import the MDX component and metadata
2. `apps/website/content/blog/metadata.ts` — import only the `.meta.ts` sidecar

The sitemap, category filters, and listing pages pick it up automatically.

---

## 2. Review

Before merging:

- [ ] Run through the [SEO checklist](WRITING-GUIDE.md#6-seo-checklist)
- [ ] Verify the post renders correctly locally (`npm run dev -w apps/website`)
- [ ] Confirm images are in `public/images/blog/<slug>/` and use `.webp` format
- [ ] Check that `slug` in metadata matches the filename exactly

---

## 3. Deploy

Merge the post into `main`. If this is part of a monthly release, deploying happens via the [release workflow](../RELEASE.md#2-web-app--other-apps) (push `main` → `release`). For standalone posts, deploy the website independently.

---

## 4. Announce

After the post is live on the website, announce it using the CLI.

### Dry run first

Always simulate before posting to real channels:

```bash
npm run announce -w apps/website -- <slug> simulate
```

This logs the Discord and Reddit payloads without sending anything.

### Post to Discord and Reddit

```bash
npm run announce -w apps/website -- <slug>
```

### Post to a single channel

```bash
# Discord only
npm run announce -w apps/website -- <slug> discord

# Reddit only
npm run announce -w apps/website -- <slug> reddit
```

### Force announce

If `announce.enabled` is `false` in metadata but you still want to announce:

```bash
npm run announce -w apps/website -- <slug> skip-check
```

### Required environment variables

The announce script reads from `.env.local` at the repo root:

| Variable | Required for |
|----------|-------------|
| `NEXT_PUBLIC_WEBSITE_URL` | Both |
| `PRIVATE_DISCORD_WEBHOOK_URL` | Discord |
| `REDDIT_CLIENT_ID` | Reddit |
| `REDDIT_CLIENT_SECRET` | Reddit |
| `REDDIT_USERNAME` | Reddit |
| `REDDIT_PASSWORD` | Reddit |

### What the script does

- **Discord:** Posts a rich embed to the forum channel webhook. Creates a forum thread with the post title, category emoji, OG image, and reading time. Category-specific tags are applied automatically.
- **Reddit:** Submits a link post to the configured subreddit with automatic flair based on category.

---

## 5. In-App Notification (future)

> **Status:** Not yet implemented.

Plan: show a one-time popup or banner inside the webapp when users log in after a new release, linking to the blog post. This will use the existing Mantine `Notifications` system already set up in the webapp.

---

## Monthly Release Post Checklist

When writing the blog post for a monthly release:

1. Pull the new features and fixes from `CHANGELOG.md` for the version
2. Write the post following [WRITING-GUIDE.md](WRITING-GUIDE.md) — focus on *what's new for users*, not internal changes
3. Set `announce.enabled: true` in metadata
4. Deploy with the release
5. Run `npm run announce -w apps/website -- <slug> simulate` to verify
6. Run `npm run announce -w apps/website -- <slug>` to go live
