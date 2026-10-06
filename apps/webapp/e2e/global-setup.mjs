import { ensureWslgDisplay } from "../scripts/ensure-wslg-display.mjs";
import { assertDevStackReady } from "./assert-dev-stack.mjs";

/**
 * Confirm Mailpit, API, and webapp are already up.
 * Playwright does not start or kill those processes.
 */
export default async function globalSetup() {
  if (ensureWslgDisplay()) {
  }

  await assertDevStackReady();
}
