/**
 * Playwright generator for Chrome Web Store listing PNGs.
 *
 * Does not start the API and does not use `scripts/run-playwright.mjs`
 * (that runner probes the API). Reuse a running webapp with:
 *
 *   E2E_REUSE_SERVER=1 pnpm --filter webapp run store-shots
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const reuseExistingServer = process.env.E2E_REUSE_SERVER === "1";
// Next dev serves client chunks from localhost in this workspace. Using 127.0.0.1
// leaves client-only visuals (notably PeopleMap) unhydrated behind 403 responses.
const e2eHost = process.env.E2E_PUBLIC_HOST ?? "localhost";
const E2E_WEBAPP_URL = `http://${e2eHost}:26632`;
const e2eDir = dirname(fileURLToPath(import.meta.url));
const webappRoot = join(e2eDir, "..");

export default defineConfig({
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: false,
  projects: [
    {
      name: "store-shots",
      testMatch: /store-shots\.spec\.ts/,
    },
  ],
  reporter: [["list"]],
  retries: 0,
  testDir: ".",
  timeout: 60_000,
  tsconfig: "./tsconfig.json",
  use: {
    baseURL: E2E_WEBAPP_URL,
    deviceScaleFactor: 1,
    viewport: { height: 800, width: 1280 },
  },
  webServer: {
    // Root `pnpm run dev -w webapp` hits turbo (`-w` is workspace-root, not npm `-w`).
    command: "pnpm run dev",
    cwd: webappRoot,
    reuseExistingServer,
    timeout: 180_000,
    url: `${E2E_WEBAPP_URL}/dev/store-shots`,
  },
  workers: 1,
});
