---
name: bondery-chrome-extension
description: >
  Bondery Chrome extension (WXT/MV3) — background-only API, typed messaging,
  LinkedIn/Instagram content scripts, webapp postMessage bridge, unpacked OAuth,
  and Chrome Web Store listing graphics. Use when changing apps/chrome-extension,
  WXT, content scripts, service worker, popup, chrome.identity, unpacked load,
  host_permissions, shadow root, LinkedIn scrape, Instagram intercept, webapp
  bridge, store-shots, CWS screenshots, MIN_EXTENSION_VERSION, or chromiumapp.org.
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery Chrome Extension

Alien runtime: **WXT + Manifest V3 + host-page injection**. Not a Next.js app and not a Fastify client with a popup bolted on.

## When to use

- Changing `apps/chrome-extension` (WXT config, entrypoints, features, `lib/`)
- Content scripts, service worker, popup, `chrome.identity`, or unpacked load
- LinkedIn scrape, Instagram intercept, or webapp `postMessage` bridge
- `host_permissions`, shadow root / `:host`, or `MIN_EXTENSION_VERSION`
- Chrome Web Store listing graphics (`store-shots`, CWS screenshots)

## Do not activate for

- Fastify routes or HTTP contracts the extension happens to call → [bondery-api](../bondery-api/SKILL.md)
- Chrome Web Store **publish wait** / production `vX.Y.Z` sequencing → [bondery-release](../bondery-release/SKILL.md)
- Bridge / interceptor **threat model** (spoofable `postMessage`, MAIN-world privilege) → [bondery-security](../bondery-security/references/integrations-and-clients.md)
- Popup / content-script **i18n** → [bondery-ux](../bondery-ux/SKILL.md)
- Generic WXT or MV3 tutorials — this skill is Bondery gotchas only

## Non-negotiables

Agents get these wrong:

1. **Background-only HTTP.** Only `features/background/` and `lib/api/` import `lib/api`. Popup and content scripts `browser.runtime.sendMessage`. Enforced by `apps/chrome-extension/scripts/check-extension-patterns.ts`.
2. **Thin WXT shells.** Entrypoints import `features/`. `entrypoints/background/index.ts` stays ≤ 30 lines (`initBackground()`).
3. **No WXT auto-imports** — `imports: false` in `wxt.config.ts`. Write explicit imports.
4. **Never force `NODE_ENV` in Vite `define`.** Forcing production while the React plugin still emits `jsxDEV` kills the popup.
5. **Env is baked at WXT build time.** Production CI must not bake localhost `BONDERY_PUBLIC_API_URL` / `BONDERY_PUBLIC_WEBAPP_URL`.
6. **`webapp.content` matches:** production CWS (`BONDERY_EXTENSION_FLAVOR=production`) is `https://app.usebondery.com/*` + localhost only. Staging/RC may add the baked `BONDERY_PUBLIC_WEBAPP_URL` origin (beta). `host_permissions` *are* computed from env origins.
7. **`cssInjectionMode: "ui"` + shadow root.** Mantine root is `:host`, not `:root`.
8. **`webExt.disabled: true`.** `pnpm exec wxt` will not launch Chrome. Load `dist/chrome-mv3-dev` unpacked yourself.
9. **Never import `apps/chrome-extension` into the webapp, or webapp components into the extension** ([ADR 0007](../../../docs/adr/0007-cws-listing-compositions.mdx)).
10. **Store-shots:** do not use `scripts/run-playwright.mjs`; do not commit PNGs; use `localhost` not `127.0.0.1` (PeopleMap tiles 403 otherwise).

Directory name is `bondery-chrome-extension`, not `bondery-extension` (collides with Postgres extensions in `bondery-core`).

## Decision tree

| Task | Read |
|------|------|
| Layers, import policy, add an API call, message router | [references/architecture.md](references/architecture.md) |
| Unpacked load, ports, Windows polling, OAuth, 426 sim | [references/local-dev.md](references/local-dev.md) |
| LinkedIn, Instagram, webapp bridge, enrich, shadow DOM | [references/host-integrations.md](references/host-integrations.md) |
| Env bake, manifest, `host_permissions`, `web_accessible_resources` | [references/env-and-manifest.md](references/env-and-manifest.md) |
| CWS 1280×800 PNGs / store-shots generator | [references/store-listing.md](references/store-listing.md) |
| HTTP 401 / 426 / `X-Bondery-Extension-Version` | [api-usage.md](../bondery-api/references/api-usage.md), [versioning.md](../bondery-api/references/versioning.md) |
| Tokens, PKCE, bridge spoofing | [auth-and-sessions.md](../bondery-security/references/auth-and-sessions.md), [integrations-and-clients.md](../bondery-security/references/integrations-and-clients.md) |
| CWS publish wait / permission-review sequencing | [extension.md](../bondery-release/references/extension.md) |
| User-visible strings | [bondery-ux](../bondery-ux/SKILL.md) |
| Future Playwright + extension fixture | [per-client.md](../bondery-e2e-tests/references/per-client.md) |

Full index: [references/README.md](references/README.md).

## Cross-skill owners

| Domain | Owner |
|--------|-------|
| Fastify routes, resource-keyed JSON, 426 catalog | [bondery-api](../bondery-api/SKILL.md) |
| Auth tokens, MAIN-world privilege, postMessage threat model | [bondery-security](../bondery-security/SKILL.md) |
| `vX.Y.Z` CWS, RC staging zip | [bondery-release](../bondery-release/SKILL.md) |
| i18n / UX writing | [bondery-ux](../bondery-ux/SKILL.md) |
| Webapp login E2E (`127.0.0.1`) | [bondery-e2e-tests](../bondery-e2e-tests/SKILL.md) |
| Unpacked OAuth redirect URI | [CHROME-EXTENSION-OAUTH.md](../../workflows/CHROME-EXTENSION-OAUTH.md) |
| Listing composition *decision* | [ADR 0007](../../../docs/adr/0007-cws-listing-compositions.mdx) |

## Pre-ship checklist

- [ ] `lib/api` imported only from `features/background/` or `lib/api/`
- [ ] New HTTP call: domain function → `ExtensionMessage` type → `message-router.ts` → `sendMessage` from UI
- [ ] Background `entrypoints/background/index.ts` still ≤ 30 lines
- [ ] No WXT auto-imports; no `NODE_ENV` in Vite `define`
- [ ] Content UI uses `renderInShadowRoot` + `:host` (not `:root`)
- [ ] `webapp.content` matches: CWS production is prod + localhost only; staging may add baked beta origin
- [ ] New `permissions` / `host_permissions` treated as a CWS review event ([extension.md](../bondery-release/references/extension.md))
- [ ] Production bake does not inline localhost API/webapp URLs
- [ ] No `apps/chrome-extension` ↔ webapp component imports
- [ ] Store-shots: `E2E_REUSE_SERVER=1 pnpm --filter webapp run store-shots`; PNGs stay in gitignored `tmp/cws-shots/`
- [ ] `pnpm run check:types -w chrome-extension` and `pnpm run check:extension-patterns`
- [ ] User-visible strings go through `packages/translations` ([bondery-ux](../bondery-ux/SKILL.md))
- [ ] User-visible product change → [bondery-changelog](../bondery-changelog/SKILL.md)
