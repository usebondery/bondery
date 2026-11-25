/**
 * Write the Stripe CLI listen signing secret into root `.env.local` and sync app env files.
 *
 *   pnpm run setup:stripe
 *   pnpm run setup:stripe -- --force
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createCliLogger } from "@bondery/helpers/cli";
import { ENV_MANIFEST, parseEnvFile } from "../../packages/helpers/src/env/index.ts";
import { upsertEnvAssignments } from "../env/env-upsert.js";
import {
  decideWebhookSecretUpsert,
  printStripeListenSecret,
  probeStripeCli,
  repoRootFromScripts,
  stripeCliFailure,
} from "./stripe-cli.js";

const STRIPE_LOGIN_RE = /stripe login/iu;

const WEBHOOK_SECRET_KEY = "BONDERY_PRIVATE_STRIPE_WEBHOOK_SECRET";

const log = createCliLogger("setup:stripe");
const repoRoot = repoRootFromScripts();
const rootEnv = join(repoRoot, ".env.local");

function webhookSecretExampleValue(): string {
  const entry = ENV_MANIFEST.find((item) => item.canonical === WEBHOOK_SECRET_KEY);
  return entry?.exampleValue ?? "whsec_<your-stripe-webhook-secret>";
}

function run(cmd: string) {
  execSync(cmd, { cwd: repoRoot, stdio: "inherit" });
}

function main() {
  const force = process.argv.includes("--force");

  log.step(1, 4, "Check Stripe CLI");
  const cliFailure = stripeCliFailure(probeStripeCli());
  if (cliFailure) {
    log.error(cliFailure.error);
    log.info(cliFailure.hint);
    process.exitCode = 1;
    return;
  }

  log.step(2, 4, "Read CLI webhook signing secret");
  const printed = printStripeListenSecret();
  if (!printed.ok) {
    if (STRIPE_LOGIN_RE.test(printed.error)) {
      log.error("Stripe CLI is not logged in");
      log.info("Run: stripe login");
      process.exitCode = 1;
      return;
    }
    log.error(printed.error);
    process.exitCode = 1;
    return;
  }

  log.step(3, 4, `Write ${WEBHOOK_SECRET_KEY} to .env.local`);
  if (!existsSync(rootEnv)) {
    log.error("Missing .env.local — run: pnpm run setup:dev");
    process.exitCode = 1;
    return;
  }

  const current = parseEnvFile(rootEnv)[WEBHOOK_SECRET_KEY];
  const decision = decideWebhookSecretUpsert({
    current,
    exampleValue: webhookSecretExampleValue(),
    force,
    next: printed.secret,
  });

  if (decision === "skip") {
    log.warn(`${WEBHOOK_SECRET_KEY} is already set and is not the example placeholder`);
    log.info("Re-run with --force to replace it with the Stripe CLI listen secret");
    log.info("Then restart the API so it reloads env");
    process.exitCode = 1;
    return;
  }

  if (decision === "match") {
    log.success(`${WEBHOOK_SECRET_KEY} already matches the Stripe CLI listen secret`);
    log.info("Restart the API if webhooks still fail signature verification");
    return;
  }

  upsertEnvAssignments(rootEnv, { [WEBHOOK_SECRET_KEY]: printed.secret });
  log.warn(`Updated ${WEBHOOK_SECRET_KEY} in .env.local`);

  log.step(4, 4, "Sync app env files from .env.local");
  run("pnpm run env");

  log.success("Stripe CLI webhook secret is in local app env files");
  log.info("Restart the API (stop and re-run pnpm run dev:webapp-api) so it loads the new secret");
  log.info("Then run pnpm run dev:stripe in a second terminal to forward events");
}

main();
