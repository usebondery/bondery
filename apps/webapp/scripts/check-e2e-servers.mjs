#!/usr/bin/env node
/**
 * Fail when Playwright cannot reach Mailpit, the API, or the webapp.
 */
import { assertDevStackReady } from "../e2e/assert-dev-stack.mjs";

try {
  const { apiUrl, cookieDomain, webappUrl } = await assertDevStackReady();
  console.log(`E2E using running stack at ${cookieDomain} (${apiUrl}, ${webappUrl}).`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
