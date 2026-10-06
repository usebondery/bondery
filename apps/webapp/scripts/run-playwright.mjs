#!/usr/bin/env node
/**
 * Run Playwright with WSLg DISPLAY fix applied in the same process tree.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureWslgDisplay } from "./ensure-wslg-display.mjs";

const webappRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function resolvePlaywrightCli() {
  const candidates = [
    join(webappRoot, "node_modules/@playwright/test/cli.js"),
    join(webappRoot, "../../node_modules/@playwright/test/cli.js"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Cannot find @playwright/test/cli.js. Run `pnpm install` from the repo root, " +
      "or `pnpm run test:e2e:install -w webapp` after the package is linked.",
  );
}

if (ensureWslgDisplay()) {
  console.log("WSLg detected — set DISPLAY=:0 for headed Chromium");
}

const needsDisplay = args.some(
  (arg) =>
    arg === "--headed" ||
    arg === "--debug" ||
    arg === "--ui" ||
    arg.includes("github-login") ||
    /(?:^|=)setup$/.test(arg),
);

const checks = ["check-e2e-servers.mjs"];
if (needsDisplay) {
  checks.push("check-playwright-display.mjs");
}

for (const script of checks) {
  const check = spawnSync("node", [`scripts/${script}`], {
    cwd: webappRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (check.status !== 0) {
    process.exit(check.status ?? 1);
  }
}

const playwright = spawnSync(
  process.execPath,
  [resolvePlaywrightCli(), "test", "-c", "e2e/playwright.config.mjs", ...args],
  {
    cwd: webappRoot,
    env: process.env,
    stdio: "inherit",
  },
);

process.exit(playwright.status ?? 1);
