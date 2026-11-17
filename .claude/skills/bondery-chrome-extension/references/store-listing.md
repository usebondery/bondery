# Chrome Web Store listing graphics

**Decision record:** [ADR 0007](../../../../docs/adr/0007-cws-listing-compositions.mdx) — keep it. This file is how to generate the PNGs.

CWS publish wait (`vX.Y.Z`, do not approve production-containers until the listing is live) stays in [bondery-release extension.md](../../bondery-release/references/extension.md). This skill does not own that gate.

## Where the compositions live

Compose in the webapp, **not** in `apps/chrome-extension`:

`apps/webapp/src/app/(app)/dev/store-shots/`

Inside the `(app)` group (i18n + Mantine) but **outside** `/app`, so the auth gate does not redirect. `layout.tsx` calls `notFound()` when `NODE_ENV === "production"` and sets `robots: { index: false, follow: false }`. Never move this tree under `/app`.

Do **not** import `apps/chrome-extension` into the webapp (or webapp feature components into the extension). Listing shots mount product chrome that already lives in the webapp (`PersonCard`, `PeopleMap`, …), not the extension popup.

Copy is **hardcoded EN** in `_lib/copy.ts`. i18next lint ignores `apps/webapp/src/app/(app)/dev/store-shots/**`. Product strings inside mounted components stay on existing i18n. Fixtures: names from `packages/tests/sample-data/bondery`; avatars are copies under `apps/webapp/public/dev/store-shots/` so typecheck and docker prune do not import JPEGs from `packages/tests`. No remote CDN photos, no official LinkedIn/Instagram logos (Tabler brand icons + nominative labels).

## Spec

- **1280×800**, `deviceScaleFactor: 1`
- **24-bit PNG, no alpha** (Playwright clip of `[data-store-shot]`)
- Five shots, all CWS screenshot slots:

| File | Slug | Intent |
|------|------|--------|
| `01-open-source.png` | `open-source` | Headline + `PersonCard`s + GitHub / EU / Docker |
| `02-save-a-profile.png` | `save-a-profile` | LinkedIn + Instagram → Bondery |
| `03-remember.png` | `remember` | `InteractionsList` / group call |
| `04-stay-organized.png` | `stay-organized` | Tags, `GroupCard`s, `PeopleMap`, AI prompt |
| `05-every-surface.png` | `every-surface` | Web, mobile, API, MCP as surface labels |

Output: gitignored `tmp/cws-shots/` (repo `/tmp/` gitignore). **Do not commit the PNGs.**

## Generate

```bash
E2E_REUSE_SERVER=1 pnpm --filter webapp run store-shots
```

That is `pnpm dlx --package @playwright/test@1.62.1 playwright test -c e2e/store-shots.playwright.config.mjs`. Do **not** add `@playwright/test` to `apps/webapp` — Next's optional Playwright peer re-keys the lockfile and breaks docker prune. It does **not** start the API.

**Do not** use `scripts/run-playwright.mjs` — that runner probes API port 26631.

**Host is `localhost`, not `127.0.0.1`.** Next dev serves client chunks from `localhost`; `127.0.0.1` leaves PeopleMap tiles unhydrated (403). This is the opposite of webapp login E2E, which requires `127.0.0.1` — see [bondery-e2e-tests](../../bondery-e2e-tests/SKILL.md). Do not fold store-shots into the login Playwright projects.

`E2E_REUSE_SERVER=1` reuses webapp on 26632; otherwise the config starts webapp only (`pnpm run dev` from `apps/webapp`). Root `pnpm run … -w webapp` is Turbo, not a workspace filter — use `--filter webapp` as above, or `pnpm run store-shots` from `apps/webapp`.

Inspect `tmp/cws-shots/*.png`, then **manual** CWS upload. No upload API.

## Store-listing checklist

- [ ] Generated via `store-shots` script, not `run-playwright.mjs`
- [ ] Viewport 1280×800; PNGs have no alpha
- [ ] `localhost` used so PeopleMap hydrates
- [ ] PNGs left in `tmp/cws-shots/` — not committed
- [ ] No `apps/chrome-extension` import in store-shot components
- [ ] Hardcoded EN still behind the i18n ignore glob
- [ ] CWS upload is manual; product deploy wait is `bondery-release`, not this file
