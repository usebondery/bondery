/**
 * Playwright generator for the website hero screenshot.
 *
 * Writes `apps/website/public/images/hero-app-dashboard.png` (2880x1620).
 * See `hero-shot.spec.ts` for what it does and the full usage notes.
 *
 * Playwright does not start the API, the webapp, or Mailpit. `globalSetup`
 * fails with the start commands when any of them is down.
 *
 *   pnpm --filter webapp run hero-shot
 */
import { defineConfig, devices } from "@playwright/test";
import { resolveE2ePublicUrls } from "./resolve-e2e-public-urls.mjs";

// Cookies are scoped to the BONDERY_PUBLIC_* host, so the baseURL must come from
// the same env the API uses (not a hard-coded localhost).
const { webappUrl } = resolveE2ePublicUrls();

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  globalSetup: "./global-setup.mjs",
  projects: [
    {
      name: "hero-shot",
      testMatch: /hero-shot\.spec\.ts/,
    },
  ],
  reporter: [["list"]],
  retries: 0,
  testDir: ".",
  // Magic-link sign-in, a 70-contact import with avatars, and widget loading.
  timeout: 300_000,
  tsconfig: "./tsconfig.json",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: webappUrl,
    colorScheme: "dark",
    deviceScaleFactor: 2,
    headless: true,
    viewport: { height: 810, width: 1440 },
  },
  workers: 1,
});
