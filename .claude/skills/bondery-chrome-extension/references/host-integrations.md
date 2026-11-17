# Host integrations

Threat model (spoofable `postMessage`, MAIN-world privilege): [integrations-and-clients.md](../../bondery-security/references/integrations-and-clients.md). This file is how the integrations are built.

## Shadow DOM

LinkedIn and Instagram content scripts set `cssInjectionMode: "ui"`. UI mounts through `lib/ui/renderInShadowRoot.tsx` (`createShadowRootUi`).

WXT rewrites `:root` → `:host` in bundled CSS. Mantine must match:

- `cssVariablesSelector=":host"`
- `getRootElement={() => shadowHost}` so `data-mantine-color-scheme` is on the host

Popup and welcome are not in a shadow root — they import Mantine CSS at their own entrypoints. Do not copy `:host` there.

## LinkedIn

Entrypoint: `entrypoints/linkedin.content/index.tsx`. Matches `https://www.linkedin.com/*`, `https://linkedin.com/*`, `https://*.linkedin.com/*`. `runAt: "document_start"`.

**Scrape** (`features/linkedin/scrape/scrapeProfile.ts`): Voyager is primary (`fetchFullWorkHistory`, `fetchFullEducation`, `fetchVoyagerProfileMeta` for location + identity + About/`summary`). About comes from dash FullProfile, classic `identity/profiles`, and nested JSON; GraphQL identity queries often omit `summary`. SDUI/DOM is fallback (`extractSduiWorkHistory`, `extractSduiEducation`, `extractSduiIdentity`, `extractSduiBio`). Do not use the vanity handle as `firstName`. Isolated-world `fetch` is `chrome-extension://…` origin — Voyager must use `credentials: "include"` (not `same-origin`) so `host_permissions` send `li_at` / `JSESSIONID`.

**Button:** delayed inject (1.5s, retry 3s) so the action bar exists. SPA: poll `location.href` every 500ms, `clearStaleButtonIfNeeded`, re-inject after 1s. `MutationObserver` on `document.body` waits for `button.artdeco-button` or `data-control-name="message"` (locale-safe; do not rely on English `aria-label^='Message'` alone).

**Open in Bondery** (`LinkedInButton`): scrape then `ADD_PERSON_REQUEST`. If the contact already exists, opens `${config.appUrl}${WEBAPP_ROUTES.PERSON}/:id`.

**Auto-enrich** (`autoEnrich.ts`): same scrape as Open in Bondery. Background tabs often have no Message button; wait for SDUI topcard + Voyager URN instead. Compare handles with NFC + `/in/{vanity}` path extraction so unicode slugs and extra path segments still match. **Never poll with `requestAnimationFrame`** — Chrome pauses rAF in inactive tabs, so the timeout never runs and enrich hangs. Use `pollUntil` (`setTimeout` / `setInterval`).

## Instagram

Entrypoint: `entrypoints/instagram.content/index.tsx`. Injects MAIN-world interceptor via `injectScript("/instagram-interceptor.js", { keepInDom: true })` at `document_start`. The unlisted script is `entrypoints/instagram-interceptor.ts` (`defineUnlistedScript` → `installInstagramNetworkInterceptor`). Manifest lists it under `web_accessible_resources` for Instagram matches.

The interceptor patches `fetch`/`XHR`, looks for GraphQL `PolarisProfilePageContentQuery`, and `postMessage`s `BONDERY_IG_NETWORK_META` with source `bondery-instagram-network-interceptor`. The isolated-world content script reads that into `lastInterceptedProfileMeta`. That channel is **privileged and spoofable** — implement the intercept here; do not “harden” it in this skill (security owns the threat model).

SPA URL polling and MutationObserver mirror LinkedIn. Button custom element: `bondery-instagram`.

## Webapp bridge

Entrypoint: `entrypoints/webapp.content/index.tsx`. **Matches always include:** `https://app.usebondery.com/*`, `http://localhost/*`, `http://127.0.0.1/*`. Staging and custom domains never get this script unless those strings change (or the baked webapp origin is added for non-production flavor).

`features/webapp-bridge/index.ts` translates page `postMessage` ↔ background `sendMessage`:

| Page → extension | Extension → page |
|------------------|------------------|
| `BONDERY_EXTENSION_PING` | `BONDERY_EXTENSION_PONG` (+ `version`) |
| `BONDERY_AUTH_STATUS_REQUEST` | `BONDERY_AUTH_STATUS_RESPONSE` |
| `BONDERY_ENRICH_REQUEST` | `BONDERY_ENRICH_RESULT` |
| `BONDERY_OPEN_EXTENSIONS_PAGE` | `BONDERY_OPEN_EXTENSIONS_PAGE_ACK` |

Webapp detector: `apps/webapp/src/lib/extension/detectBonderyChromeExtension.ts` (ping/pong, default 1200ms). Enrich calls `checkExtensionAuth` (ping first, then auth; missing ping is "not installed").

## Enrich from LinkedIn

Background `features/background/enrich.ts`:

1. Webapp → bridge → `ENRICH_PERSON_REQUEST`.
2. Background opens an **inactive** LinkedIn tab for `/in/{handle}/`.
3. Pending state in memory + `chrome.storage.session` key `pendingEnrich` (survives SW restart).
4. Alarms: **180s** scrape timeout (`3` min), keepalive every **0.4** min so the service worker does not sleep. Keepalive stays until **after** `POST /contacts/:id/enrich` returns (not only until scrape submit).
5. On tab complete (plus retries), `RUN_PENDING_ENRICH`. Content script asks `GET_ENRICH_CONTEXT`, scrapes the same way as Open in Bondery (Voyager company/school logos and About/summary), `SUBMIT_ENRICH_DATA`.
6. Background calls `enrichPersonFromLinkedIn`. The API writes LinkedIn history **first**, then logos / photo / geocode. Then the LinkedIn tab closes and `ENRICH_PERSON_RESULT` is sent to the webapp tab.
7. The webapp waits **270s** for that result (`ENRICH_VIA_EXTENSION_TIMEOUT_MS`) so scrape + API logo uploads are not racing the same budget.

Requires a **LinkedIn session in the same Chrome profile**. A logged-out enrich tab will scrape a login wall.

## Facebook

`ScrapedProfileData.platform` and `findPersonBySocial` accept `"facebook"`. There is **no** `facebook.content` entrypoint and no host inject. Do not add a Facebook button because the union mentions it.

## Host-integrations checklist

- [ ] New host UI goes through `renderInShadowRoot` with `:host`
- [ ] LinkedIn inject stays locale-agnostic (control-name / artdeco, not English aria-label only)
- [ ] Instagram interceptor stays unlisted + `web_accessible_resources`; threat model reviewed in `bondery-security`
- [ ] Bridge matches still prod + localhost + 127.0.0.1 unless product explicitly expands them
- [ ] LinkedIn waits use `pollUntil` / timers, not `requestAnimationFrame` (background enrich tabs pause rAF)
- [ ] No Facebook content script “for completeness”
