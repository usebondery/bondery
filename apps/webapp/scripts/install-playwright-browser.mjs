#!/usr/bin/env node
/**
 * Download Playwright's Chromium build into ~/.cache/ms-playwright.
 * System libraries (WSL/Linux) are a separate step — see test:e2e:install-deps.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webappRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

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

  throw new Error("Cannot find @playwright/test/cli.js. Run `pnpm install` from the repo root.");
}

function run(command) {
  execSync(command, { cwd: webappRoot, stdio: "inherit" });
}

console.log("Downloading Playwright Chromium...");
run(`"${process.execPath}" "${resolvePlaywrightCli()}" install chromium`);

const cacheRoot = join(homedir(), ".cache", "ms-playwright");
const chromiumDirs = existsSync(cacheRoot)
  ? execSync(`ls -1 ${JSON.stringify(cacheRoot)}`, { encoding: "utf8" })
      .split("\n")
      .filter((name) => name.startsWith("chromium-"))
  : [];

const chromiumDir = chromiumDirs.at(-1);
const chromeBinary = chromiumDir ? join(cacheRoot, chromiumDir, "chrome-linux64", "chrome") : null;

if (chromeBinary && existsSync(chromeBinary)) {
  console.log(`\nChromium ready at ${chromeBinary}`);
  process.exit(0);
}

console.error(
  "\nChromium binary still missing after install. Try:\n" +
    "  pnpm run test:e2e:install-deps -w webapp\n",
);
process.exit(1);
