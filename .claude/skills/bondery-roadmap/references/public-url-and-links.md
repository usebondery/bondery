# Public URL and links

## URLs

| Purpose | URL | Constant |
|---------|-----|----------|
| User-facing link | `https://usebondery.com/roadmap` | `ROADMAP_URL` |
| Plane publish target | `https://sites.plane.so/issues/8a364296fbbc4c858adeb1952a72a451` | `PUBLIC_ROADMAP_PLANE_URL` |
| Changelog | `https://usebondery.com/docs/changelog` | `CHANGELOG_URL` |

**Rule:** README, docs, footer, and community posts use `ROADMAP_URL`. Only the website redirect route imports `PUBLIC_ROADMAP_PLANE_URL`.

## Website redirect

Mirror [`apps/website/src/app/status/route.ts`](../../../../apps/website/src/app/status/route.ts):

- **Path:** `apps/website/src/app/roadmap/route.ts`
- **Mechanism:** `redirect(PUBLIC_ROADMAP_PLANE_URL)` via `next/navigation`
- **Not** in `next.config.ts` — outbound redirects live in `src/app/**/route.ts` so they can import `@bondery/helpers`

## Surfaces that link to the roadmap

| Surface | Location |
|---------|----------|
| GitHub README | Centered nav row |
| Website footer | Product group — `/roadmap`, `target="_blank"` |
| Docs | `docs/roadmap.mdx` in Help & updates nav |
| Changelog | Intro cross-link in `docs/changelog/index.mdx` |

## Public URL checklist

- [ ] New links use `ROADMAP_URL` or `/roadmap` — not raw Plane URL
- [ ] `roadmap/route.ts` redirects to `PUBLIC_ROADMAP_PLANE_URL`
- [ ] Constants exported from `@bondery/helpers`
