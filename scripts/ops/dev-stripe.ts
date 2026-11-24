/**
 * Forward Stripe events to the local API webhook (`POST /webhooks/stripe`).
 *
 *   pnpm run setup:stripe   # once per machine
 *   pnpm run dev:stripe     # second terminal while the API is running
 */

import { createCliLogger } from "@bondery/helpers/cli";
import {
  probeStripeCli,
  spawnStripeListen,
  stripeCliFailure,
  stripeListenForwardUrl,
} from "./stripe-cli.js";

const log = createCliLogger("dev:stripe");

function main() {
  const cliFailure = stripeCliFailure(probeStripeCli());
  if (cliFailure) {
    log.error(cliFailure.error);
    log.info(cliFailure.hint);
    process.exitCode = 1;
    return;
  }

  const forwardTo = stripeListenForwardUrl();
  log.info(`Forwarding Stripe events to ${forwardTo}`);
  log.info("If signatures fail with 400, run: pnpm run setup:stripe -- --force");
  log.info("Then restart the API");
  spawnStripeListen();
}

main();
