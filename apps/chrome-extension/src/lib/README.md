# Chrome extension `lib/`

Shared runtime modules for the Bondery extension. **Only the background service worker** may call the Bondery HTTP API.

## Layer map (webapp ↔ extension)

| Webapp | Extension |
|--------|-----------|
| `lib/api/domains/contacts.ts` | `lib/api/domains/contacts.ts` (REST, same function names) |
| `lib/api/domains/me.ts` | `lib/api/domains/me.ts` |
| `lib/api/client.ts` (BFF transport) | `lib/api/transport.ts` (direct Fastify) |
| `lib/query/hooks/*` | N/A — popup uses `useState` + `runtime.sendMessage` |
| Server Components / loaders | N/A — extension has no SSR |

Domain function names match webapp where the operation exists: `findPersonBySocial`, `enrichPersonFromLinkedIn`, `fetchUserSettings`.

## Layout

| Path | Role |
|------|------|
| `lib/api/transport.ts` | `authenticatedFetch`, `AuthRequiredError`, `ExtensionOutdatedError` |
| `lib/api/domains/contacts.ts` | Contact lookup, preview, enrich, upsert |
| `lib/api/domains/me.ts` | User settings |
| `lib/auth/` | OAuth PKCE, token storage, refresh |
| `lib/messaging/types.ts` | `ExtensionMessage` union (popup ↔ background ↔ content) |
| `lib/ui/` | Mantine wrapper + shadow-root render helper |

## Context import policy

| Context | May import | Must not import |
|---------|------------|-----------------|
| Content scripts (`entrypoints/*.content`, interceptors) | `lib/messaging`, `lib/ui`, `features/*/ui`, `features/*/intercept` | `lib/api/*`, `lib/auth/*` |
| Service worker | `lib/*`, `features/background/*` | `features/popup/*`, React UI |
| Popup / welcome | `lib/messaging`, `lib/ui`, `features/popup/*`, `features/welcome/*` | `lib/api/*` |
| Platform scrape | `@bondery/helpers`, `@bondery/schemas`, DOM / third-party fetch | Bondery `lib/api` |

## Message gateway

Popup and content scripts talk to the background via typed messages in `lib/messaging/types.ts`. The background message router lives in `features/background/message-router.ts`.

## Adding a new API call

1. Add a domain function in `lib/api/domains/<area>.ts` (calls `authenticatedFetch` via transport).
2. Add request/response types to `lib/messaging/types.ts`.
3. Handle the message in `features/background/message-router.ts` (call the domain function).
4. From popup or content script, use `browser.runtime.sendMessage({ type: "..." })` — never import `lib/api` outside background.

## Feature modules

| Path | Role |
|------|------|
| `features/background/` | Service worker: `init`, `message-router`, `oauth`, `badge`, `person-cache`, `enrich`, `version-check` |
| `features/popup/`, `features/welcome/` | Extension UI |
| `features/linkedin/`, `features/instagram/` | Platform UI + scrape/intercept |
| `features/webapp-bridge/` | Webapp ↔ extension postMessage bridge |

Entrypoints under `entrypoints/` are thin WXT shells that import from `features/`.
