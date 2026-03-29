/**
 * Global Fastify hook that enforces a minimum Chrome extension version.
 *
 * Requests from the extension (identified by the absence of a Cookie header)
 * must include a valid `X-Bondery-Extension-Version` header whose value is at or above
 * `MIN_EXTENSION_VERSION`. Requests that fail this check receive 426 Upgrade Required.
 *
 * Webapp requests always carry a Cookie header alongside their Bearer token,
 * so they bypass this check entirely.
 */

import type { FastifyInstance } from "fastify";
import { isVersionBelow, CHROME_EXTENSION_URL, MIN_EXTENSION_VERSION } from "@bondery/helpers";

/**
 * Registers a global `onRequest` hook that rejects outdated or header-less
 * extension requests with HTTP 426 Upgrade Required.
 *
 * @param fastify - The Fastify instance
 */
export function registerExtensionVersionCheck(fastify: FastifyInstance): void {
  fastify.addHook("onRequest", async (request, reply) => {
    // No enforcement when the minimum is the default "0.0.0"
    if (!MIN_EXTENSION_VERSION || MIN_EXTENSION_VERSION === "0.0.0") {
      return;
    }

    // Skip unauthenticated health-check routes
    if (request.url === "/status") {
      return;
    }

    // Webapp requests always include a Cookie header — let them through
    if (request.headers.cookie) {
      return;
    }

    const extensionVersion = request.headers["x-bondery-extension-version"] as string | undefined;

    // Missing header + no cookie = old extension without header support → reject
    if (!extensionVersion) {
      reply.code(426).header("Upgrade", "X-Bondery-Extension-Version").send({
        error: "Extension update required",
        code: "EXTENSION_OUTDATED",
        minVersion: MIN_EXTENSION_VERSION,
        storeUrl: CHROME_EXTENSION_URL,
      });
      return;
    }

    // Header present but version too low → reject
    if (isVersionBelow(extensionVersion, MIN_EXTENSION_VERSION)) {
      reply.code(426).header("Upgrade", "X-Bondery-Extension-Version").send({
        error: "Extension update required",
        code: "EXTENSION_OUTDATED",
        minVersion: MIN_EXTENSION_VERSION,
        storeUrl: CHROME_EXTENSION_URL,
      });
      return;
    }
  });
}
