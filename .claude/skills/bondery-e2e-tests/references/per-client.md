# Per-client test layout

Today only **webapp** has Playwright E2E. Plan new harnesses per client without mixing concerns.

## Current state

| Client | E2E tool | Location | Status |
|--------|----------|----------|--------|
| webapp | Playwright | `apps/webapp/e2e/` | **Active** — login, OAuth, session |
| api | Fastify inject / supertest | route tests in `apps/api` | Integration, not browser E2E |
| mobile | Detox or Maestro (TBD) | `apps/mobile/e2e/` (future) | Not yet |
| website | Playwright (TBD) | `apps/website/e2e/` (future) | Not yet |
| chrome-extension | Playwright extension mode (TBD) | `apps/chrome-extension/e2e/` (future) | Not yet |

## Target layout (future)

```
apps/
├── webapp/e2e/           # Playwright — product app (exists)
├── website/e2e/          # Playwright — marketing site smoke tests
├── mobile/e2e/           # Detox/Maestro — native flows
├── chrome-extension/e2e/ # Playwright + extension fixture
└── api/
    └── src/**/__tests__/ # HTTP integration — not browser E2E
```

Each client owns its config, env vars, and npm scripts (`test:e2e -w <workspace>`).

## Principles

1. **One config per app** — do not share a monolithic Playwright config across webapp and website; baseURL, ports, and webServer differ.
2. **Shared helpers in packages** — if multiple clients need the same test data factories, put them in `packages/` (e.g. test fixtures), not copied across e2e folders.
3. **API contract tests stay in api** — browser E2E should not replace `check:openapi` or route-level tests.
4. **Mobile native E2E is separate** — Expo/React Native needs Detox or Maestro; do not force Playwright for native navigation.

## Website (planned)

Smoke tests only: homepage loads, docs links resolve, CTA routes. No OAuth — keep fast and unauthenticated.

## Mobile (planned)

Focus on: app launch, offline read of synced data, submit mutation while offline. Sync correctness belongs in integration tests (`check-sync-patterns`); E2E validates user-visible outcomes.

## Chrome extension (planned)

Playwright Chromium with extension loaded. Test: popup opens, content script injects on allowed origin. Keep separate from webapp E2E ports. Functional extension Playwright remains TBD.

Store-shots (`apps/webapp/e2e/store-shots.spec.ts`) is a listing-PNG generator under the webapp. It uses `localhost`, not `127.0.0.1`, so PeopleMap hydrates. Do not fold it into webapp login E2E. Generator runbook: [store-listing.md](../../bondery-chrome-extension/references/store-listing.md).

## API (integration, not E2E)

Server "E2E" means full HTTP stack against test DB:

- Spin test DB (docker or ephemeral)
- `fastify.inject()` or live port
- Assert status, body shape, auth

Document in `bondery-api` references — not this skill's Playwright sections.

## Per-client checklist

- [ ] New client E2E lives under `apps/<client>/e2e/`
- [ ] Dedicated `playwright.config` (or native runner config) per app
- [ ] `test:e2e` script in client `package.json`
- [ ] No cross-import of webapp auth fixtures from other clients
- [ ] Shared test data extracted to `packages/` if reused 2+ times
