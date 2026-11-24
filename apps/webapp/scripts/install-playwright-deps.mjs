#!/usr/bin/env node
/**
 * Install Linux packages Chromium needs (WSL/Ubuntu). Requires sudo.
 * `sudo npx` fails on WSL because root's PATH does not include Node — we pass PATH through.
 */
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function main() {
  const webappRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

  const command = 'sudo env "PATH=$PATH" pnpm exec playwright install-deps chromium';

  console.log("Installing Playwright system dependencies (sudo required)...");
  console.log(`> ${command}\n`);

  try {
    execSync(command, { cwd: webappRoot, shell: "/bin/bash", stdio: "inherit" });
  } catch {
    console.error(
      "\nIf sudo/playwright install-deps fails, install packages manually:\n" +
        "  sudo apt-get update && sudo apt-get install -y \\\n" +
        "    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \\\n" +
        "    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \\\n" +
        "    libgbm1 libasound2 libpango-1.0-0 libcairo2\n",
    );
    process.exitCode = 1;
  }
}

main();
