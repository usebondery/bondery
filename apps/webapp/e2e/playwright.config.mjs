/**
 * Playwright E2E — webapp login / OAuth BFF
 *
 * ## Prerequisites
 *
 * - Playwright browser (once per machine): `pnpm run test:e2e:install -w webapp`
 * - WSL/Linux system libs (once, sudo): `pnpm run test:e2e:install-deps -w webapp`
 * - **Headed GitHub login needs a display** (WSLg on Win11, VcXsrv + DISPLAY, or run from Windows).
 *   Headless specs (`unauth`, `oauth-callback`, `auth`, `login-email`) do not need a display.
 * - Mailpit (`pnpm run start:mailpit`) plus API SMTP on `127.0.0.1:26640`.
 * - API + webapp env files with GitHub OAuth and webapp OAuth client secrets (same as daily dev).
 * - Public URLs come from BONDERY_PUBLIC_API_URL and BONDERY_PUBLIC_WEBAPP_URL
 *   after loading `apps/api/.env.development.local`. Do not set E2E_PUBLIC_HOST
 *   unless it matches those hosts. A mismatch fails at config load.
 * - GitHub OAuth app callback: `<BONDERY_PUBLIC_API_URL>/auth/callback/github`
 *   Run `pnpm run provision:oauth-clients` after URL changes.
 *
 * ## In-app authenticated specs
 *
 * The `auth` project depends on `email-setup`. That project signs in through
 * `/login` magic-link (Mailpit HTTP) as `e2e-agent@example.test` and writes
 * `.auth/email-user.json`. It does not use GitHub `setup` or `.auth/user.json`.
 *
 * ## Manual GitHub auth (OAuth regression only)
 *
 * Playwright cannot reuse your daily browser's GitHub session. Authenticate once in
 * Playwright's browser and save cookies to `e2e/.auth/user.json` (gitignored) only
 * when you run GitHub OAuth specs that still need `storageState`:
 *
 * ```bash
 * pnpm run test:e2e:auth-setup -w webapp
 * ```
 *
 * Re-run when GitHub sessions expire. In-app `auth` specs do not need this file.
 *
 * ## Iteration workflow
 *
 * Playwright does not start the API or webapp. Start Mailpit + `dev:webapp-api`
 * first. Missing health checks fail in globalSetup.
 *
 * ```bash
 * # Terminal 1 — Mailpit + dev stack
 * pnpm run start:mailpit
 * pnpm run dev:webapp-api
 *
 * # In-app authenticated specs (email storageState, no GitHub)
 * pnpm run test:e2e -w webapp -- --project=auth
 *
 * # Unique email login + logout (empty storage)
 * pnpm run test:e2e -w webapp -- --project=login-email
 *
 * # Unauthenticated + OAuth callback specs (no GitHub)
 * pnpm run test:e2e -w webapp -- --project=unauth --project=oauth-callback
 *
 * # Debug full GitHub login (Inspector + optional pause)
 * pnpm run test:e2e:debug -w webapp -- login.github
 *
 * # Headed GitHub login regression
 * pnpm run test:e2e:github -w webapp -- --headed
 * ```
 *
 * Set `E2E_PAUSE_GITHUB=1` to call `page.pause()` during the GitHub login spec.
 */

import { defineConfig, devices } from "@playwright/test";
import { resolveE2ePublicUrls } from "./resolve-e2e-public-urls.mjs";

const { webappUrl: E2E_WEBAPP_URL } = resolveE2ePublicUrls();

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  globalSetup: "./global-setup.mjs",
  projects: [
    {
      name: "setup",
      testMatch: /(?:^|\/)auth\.setup\.ts$/,
      timeout: 300_000,
      use: {
        headless: false,
      },
    },
    {
      name: "github-login",
      testMatch: /login\.github\.spec\.ts/,
      timeout: 300_000,
      use: {
        screenshot: "only-on-failure",
        storageState: { cookies: [], origins: [] },
        video: "retain-on-failure",
      },
    },
    {
      name: "email-setup",
      testMatch: /(?:^|\/)email\.auth\.setup\.ts$/,
      timeout: 120_000,
      use: {
        headless: true,
      },
    },
    {
      dependencies: ["email-setup"],
      name: "auth",
      testMatch: /login\.authenticated\.spec\.ts/,
      timeout: 90_000,
      use: {
        storageState: ".auth/email-user.json",
      },
    },
    {
      name: "login-email",
      testMatch: /login\.email\.spec\.ts/,
      timeout: 120_000,
      use: {
        storageState: { cookies: [], origins: [] },
      },
    },
    {
      name: "unauth",
      testMatch: /login\.unauth\.spec.ts/,
    },
    {
      name: "oauth-callback",
      testMatch: /oauth-callback\.spec\.ts/,
    },
  ],
  reporter: [["list"]],
  retries: process.env.CI ? 1 : 0,
  testDir: ".",
  tsconfig: "./tsconfig.json",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: E2E_WEBAPP_URL,
    trace: "on-first-retry",
  },
  workers: 1,
});
