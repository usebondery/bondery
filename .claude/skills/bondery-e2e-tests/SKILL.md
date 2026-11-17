---
name: bondery-e2e-tests
description: >
  Bondery end-to-end testing — test pyramid, Playwright patterns for webapp,
  Mailpit email magic-link sessions, GitHub OAuth regression, flaky-test
  strategies, and per-client test layout. Use when writing or debugging E2E
  tests, Playwright config, CI test jobs, test:e2e scripts, email.auth.setup,
  storageState, Mailpit, or planning test coverage for webapp, mobile, website,
  or API.
metadata:
  version: "1.3.1"
  namespace: bondery
---

# Bondery E2E Tests

## When to use

- Adding or changing Playwright specs in `apps/webapp/e2e/`
- Debugging flaky login, OAuth, or session tests
- Deciding unit vs integration vs E2E coverage for a feature
- Planning future test harnesses for mobile, website, chrome-extension, or API
- Writing CI workflows for browser tests

## Non-negotiables

- **Test pyramid:** unit and integration tests carry most coverage; E2E covers critical user paths only
- **Webapp E2E lives in** `apps/webapp/e2e/` with config at `e2e/playwright.config.mjs`
- **E2E URLs follow `BONDERY_PUBLIC_API_URL` / `BONDERY_PUBLIC_WEBAPP_URL`** after loading API env. Prefer `127.0.0.1` in those files. `E2E_PUBLIC_HOST` is optional and must match those hosts or config load fails. Ports `26631` (API) and `26632` (webapp)
- The store-shots Playwright generator produces Chrome Web Store marketing PNGs, not client E2E — see `bondery-chrome-extension` [store-listing.md](../bondery-chrome-extension/references/store-listing.md)
- **Prefer `data-testid` locators** (`page.getByTestId(...)`) over brittle CSS selectors
- **No `waitForTimeout`** — wait for URL, response, or locator state
- **In-app authenticated E2E** uses Mailpit magic-link login and reused `storageState` at `e2e/.auth/email-user.json` (`email-setup` → `auth`). It does **not** use GitHub `setup` or `.auth/user.json`
- **GitHub OAuth:** Playwright cannot reuse your daily browser session. Use `test:e2e:auth-setup` only for GitHub login regression (`github-login` / `auth.setup.ts`)
- **Workers = 1, fullyParallel = false** in webapp config — auth and port binding are serial today
- Playwright does not start the API or webapp. Start Mailpit and `pnpm run dev:webapp-api` first.
- Do not add E2E tests for logic better covered by unit or API integration tests
- Do not mint `bondery_webapp_session` in Node. Do not add a production test-login HTTP route. Do not import API TypeScript from Playwright. Do not use Better Auth `testUtils`

## Test pyramid (Bondery)

| Layer | Where | What to test |
|-------|-------|--------------|
| Unit | `*.test.ts` next to source, package tests | Pure functions, Zod schemas, formatters |
| Integration | API route tests, DB tests, BFF handlers | Request/response contracts, auth middleware |
| E2E | `apps/webapp/e2e/*.spec.ts` (today) | Login, session, OAuth callback, critical in-app flows |

See [references/test-pyramid.md](references/test-pyramid.md) for placement rules and anti-patterns.

## Current layout

```
apps/webapp/e2e/
├── playwright.config.mjs    # projects, ports (does not start servers)
├── global-setup.mjs         # requires Mailpit + running API + webapp
├── mailpit.ts               # Mailpit HTTP search for magic-link verify URL
├── email-login.ts           # /login email magic-link hop
├── complete-onboarding.ts   # first-run onboarding when needed
├── email.auth.setup.ts      # email login → .auth/email-user.json
├── auth.setup.ts            # manual GitHub login → .auth/user.json
├── login.unauth.spec.ts     # unauth project
├── login.github.spec.ts     # github-login project (full OAuth)
├── login.authenticated.spec.ts  # auth project (email storageState)
├── login.email.spec.ts      # login-email project (unique address + logout)
└── oauth-callback.spec.ts   # oauth-callback project
```

Run commands (from repo root):

```bash
pnpm run start:mailpit
pnpm run dev:webapp-api                                  # keep running
pnpm run test:e2e -w webapp                              # all projects
pnpm run test:e2e -w webapp -- --project=auth
pnpm run test:e2e -w webapp -- --project=login-email
pnpm run test:e2e:auth-setup -w webapp -- --headed       # GitHub OAuth only
pnpm run test:e2e -w webapp -- --project=unauth
```

Full workflow: [references/playwright-webapp.md](references/playwright-webapp.md).

## Decision tree

| Task | Read |
|------|------|
| Where tests belong (pyramid) | [references/test-pyramid.md](references/test-pyramid.md) |
| Webapp Playwright setup & projects | [references/playwright-webapp.md](references/playwright-webapp.md) |
| Per-client future layout | [references/per-client.md](references/per-client.md) |
| Flaky tests, quarantine, retries | [references/flaky-tests.md](references/flaky-tests.md) |
| CI, artifacts, reporters | [references/ci-artifacts.md](references/ci-artifacts.md) |

Full index: [references/README.md](references/README.md).

For API contract tests and route handlers, see `bondery-api`. For UI test IDs and error states, see `bondery-ux`.

## E2E checklist (before merge)

- [ ] Test targets a **critical user path** not already covered by unit/integration tests
- [ ] Locators use `data-testid` or role/name — no arbitrary CSS
- [ ] No `waitForTimeout`; waits are condition-based (URL, response, locator)
- [ ] Spec placed in correct Playwright **project** (`unauth`, `auth`, `login-email`, `github-login`, `oauth-callback`)
- [ ] New in-app authenticated specs use `auth` + `.auth/email-user.json` (do not log out — that poisons the shared session)
- [ ] Logout coverage lives in `login-email` with a unique `e2e-${id}@example.test` address
- [ ] GitHub OAuth specs documented if they need manual `auth-setup` or env secrets
- [ ] Mailpit is running (`pnpm run start:mailpit`) and `pnpm run dev:webapp-api` is already up
- [ ] Development SMTP is loopback (`127.0.0.1:26640`)
- [ ] New `data-testid` added to component if no stable locator exists
- [ ] Flaky test quarantined with `test.fixme` + issue link — not merged red
- [ ] CI job added or updated if introducing new project or env requirements
