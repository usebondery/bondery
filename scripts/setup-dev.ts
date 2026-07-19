/**
 * First-time local env setup.
 *
 *   npm run setup:dev
 *   # edit .env.local
 *   npm run env
 *   npm run dev
 */

import { execSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCliLogger } from "@bondery/helpers/cli";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const log = createCliLogger("setup:dev");

function run(cmd) {
  execSync(cmd, { cwd: repoRoot, stdio: "inherit" });
}

function main() {
  const rootEnv = join(repoRoot, ".env.local");
  const example = join(repoRoot, ".env.local.example");

  log.step(1, 2, "Ensure .env.local exists");
  if (!existsSync(example)) {
    log.info("Generating examples from manifest…");
    run("node --import tsx scripts/env.ts --write-examples");
  }
  if (!existsSync(rootEnv)) {
    copyFileSync(example, rootEnv);
    log.warn("Created .env.local from example — edit OAuth / optional integrations as needed");
  } else {
    log.info(".env.local already present");
  }

  log.step(2, 2, "Pull (if Supabase up) → sync → check");
  run("node --import tsx scripts/env.ts");

  log.success("Dev env ready");
  log.info("Next: cd apps/supabase-db && npm run dev  (if not already)");
  log.info("Then: npm run env && npm run dev");
}

main();
