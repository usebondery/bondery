# Playwright — webapp

Grounded in `apps/webapp/e2e/`. Read `playwright.config.mjs` header comments for the canonical local workflow.

## Prerequisites

- Mailpit (`pnpm run start:mailpit`) and API SMTP on `127.0.0.1:26640`
- A running API + webapp (`pnpm run dev:webapp-api`). Playwright does not start them.
- Public URLs from API env (`apps/api/.env.development.local`). Prefer **127.0.0.1**:
  - `BONDERY_PUBLIC_API_URL=http://127.0.0.1:26631`
  - `BONDERY_PUBLIC_WEBAPP_URL=http://127.0.0.1:26632`
- `E2E_PUBLIC_HOST` is optional. If set, it must match those URL hosts or Playwright fails at config load.
- GitHub OAuth app callback (GitHub regression only): `http://127.0.0.1:26631/auth/callback/github`
- Run `pnpm run provision:oauth-clients` after URL changes

## Email magic-link hop (in-app)

The webapp does not treat the Better Auth API cookie as the product session. Playwright signs in the same way a person does:

1. Open `/login`, click `login-email-submit`, fill `login-email`, click `login-email-send`
2. Poll Mailpit `GET /api/v1/search?query=to:<email>` and extract the first URL that contains `/auth/magic-link/verify` (decode `&amp;`). Do not take the latest message — first signup also sends welcome mail
3. `page.goto(verifyUrl)` in the same browser context
4. Wait for `/app/home` or `/app/onboarding`. Complete onboarding when needed (`complete-onboarding.ts`)
5. For the shared in-app user, save `storageState` to `.auth/email-user.json`

Do **not** mint `bondery_webapp_session` in Node. Do **not** add a production test-login HTTP route. Do **not** import API TypeScript from Playwright. Do **not** use Better Auth `testUtils`.

`email-setup` writes `.auth/email-user.json` for `e2e-agent@example.test`. The Fastify singleton in `apps/api/src/lib/auth/index.ts` stays production-only.

## Config highlights

| Setting | Value | Why |
|---------|-------|-----|
| `testDir` | `.` (e2e folder) | Specs colocated with config |
| `globalSetup` | `global-setup.mjs` | Requires Mailpit + API `/health/live` + webapp `/api/health/live` |
| `fullyParallel` | `false` | Serial auth + shared ports |
| `workers` | `1` | Same. Shared CRM data on `e2e-agent@example.test` is accepted |
| `retries` | `1` in CI, `0` locally | CI flake tolerance |

## Projects

| Project | Specs | Auth |
|---------|-------|------|
| `setup` | `auth.setup.ts` | Manual GitHub login → `.auth/user.json` (OAuth regression only) |
| `github-login` | `login.github.spec.ts` | Fresh context; full GitHub OAuth flow |
| `email-setup` | `email.auth.setup.ts` | Headless email magic-link → `.auth/email-user.json` |
| `auth` | `login.authenticated.spec.ts` | `storageState: .auth/email-user.json`. Depends on `email-setup` |
| `login-email` | `login.email.spec.ts` | Empty storage; unique `e2e-${id}@example.test`; logout |
| `unauth` | `login.unauth.spec.ts` | Empty storage |
| `oauth-callback` | `oauth-callback.spec.ts` | Empty storage |

`auth` depends on `email-setup`, not GitHub `setup`. GitHub `auth-setup` is only for OAuth login regression. Do not log out in `auth` specs — that revokes the shared session.

## Commands

```bash
# Terminal 1 — Mailpit + dev stack (keep running)
pnpm run start:mailpit
pnpm run dev:webapp-api

# In-app authenticated specs (no GitHub)
pnpm run test:e2e -w webapp -- --project=auth

# Unique email login + logout
pnpm run test:e2e -w webapp -- --project=login-email

# Unauthenticated specs (no GitHub)
pnpm run test:e2e -w webapp -- --project=unauth --project=oauth-callback

# GitHub OAuth storage (regression only)
pnpm run test:e2e:auth-setup -w webapp -- --headed

# Full GitHub login regression (headed)
pnpm run test:e2e:github -w webapp -- --headed

# Inspector debug
pnpm run test:e2e:debug -w webapp -- login.github
```

Set `E2E_PAUSE_GITHUB=1` to call `page.pause()` during the GitHub login spec.

## Locators

Existing test IDs:

- `login-github` — GitHub sign-in button on `/login`
- `login-email-submit` / `login-email` / `login-email-send` — email magic-link on `/login`
- `onboarding-lets-go` / `onboarding-intent-personal` / `onboarding-skip-import` — first-run onboarding

Prefer adding `data-testid` to components over CSS selectors. Use `getByRole` for accessible buttons (e.g. sign out).

## Auth storage

- In-app `auth` project: reused `e2e-agent@example.test` via `.auth/email-user.json`
- Logout lives in `login-email` with a unique address. Do not delete that user from Playwright
- `.auth/` is gitignored — `email.auth.setup.ts` writes `email-user.json`; `auth.setup.ts` writes `user.json` for GitHub OAuth only
- Session cookie name after the BFF hop: `bondery_webapp_session`
- Cookie domain / Playwright `baseURL`: hostnames of `BONDERY_PUBLIC_API_URL` and `BONDERY_PUBLIC_WEBAPP_URL`

## Adding a new spec

1. Choose the correct **project** in `playwright.config.mjs` (or add a new project if auth mode differs)
2. Create `feature-name.spec.ts` in `apps/webapp/e2e/`
3. Use `baseURL` from config — paths are relative (`/login`, `/app/home`)
4. For in-app authenticated flows, import `test` from `@playwright/test` and rely on `storageState: .auth/email-user.json`. Do not use GitHub `.auth/user.json`
5. For GitHub OAuth regression, use `github-login` or `setup` — not the email session

## Page Object Model (optional)

For multi-step flows with many locators, extract a small POM class per feature area. Keep POMs in `apps/webapp/e2e/pages/` when introduced — not required for current login specs.

## Webapp Playwright checklist

- [ ] Spec in correct project (auth mode matches)
- [ ] In-app authenticated spec uses email `storageState` (do not log out)
- [ ] Uses `getByTestId` or `getByRole` — no fragile CSS
- [ ] Waits on URL/locator, not fixed timeouts
- [ ] GitHub OAuth specs document manual auth-setup requirement
- [ ] Mailpit is running; `dev:webapp-api` is already up; development SMTP is loopback
