/**
 * Global Fastify hook that enforces a minimum Chrome extension version.
 *
 * Unauthenticated requests (no Bearer, no Cookie) receive 401 before route auth.
 * Extension clients without `X-Bondery-Extension-Version` are treated as
 * unauthenticated. Outdated extension versions receive 426 Upgrade Required.
 *
 * Webapp browser requests include a Cookie header; mobile and server clients
 * use Bearer and bypass extension version enforcement.
 */

import { CHROME_EXTENSION_URL, isVersionBelow, MIN_EXTENSION_VERSION } from "@bondery/helpers";
import { getErrorDocUrl } from "@bondery/schemas/errors";
import { URLS } from "../platform/config.js";
import { unauthorized } from "../platform/errors/http-errors.js";
import type { AppFastifyInstance } from "../platform/fastify-types.js";

function websiteBaseUrl(): string {
  return (URLS.website ?? "https://usebondery.com").replace(/\/$/, "");
}

/**
 * Registers a global `onRequest` hook for extension version enforcement and
 * early 401 rejection of unauthenticated headless requests.
 */
export function registerExtensionVersionCheck(fastify: AppFastifyInstance): void {
  fastify.addHook("onRequest", async (request, reply) => {
    // No enforcement when the minimum is the default "0.0.0"
    if (!MIN_EXTENSION_VERSION || MIN_EXTENSION_VERSION === "0.0.0") {
      return;
    }

    // Skip unauthenticated health-check routes
    if (request.url === "/status" || request.url === "/health") {
      return;
    }

    // Inbound webhooks from third-party services (e.g. Polar) have no Cookie
    // header and no extension version header. They authenticate via HMAC
    // signatures verified inside their own route handlers.
    if (request.url.startsWith("/api/webhooks/")) {
      return;
    }

    // Mobile, webapp server, and extension OAuth flows authenticate with Bearer.
    const authorization = request.headers.authorization;
    if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
      return;
    }

    // Webapp browser requests include a Cookie header — let auth strategies decide.
    if (request.headers.cookie) {
      return;
    }

    const extensionVersion = request.headers["x-bondery-extension-version"] as string | undefined;

    // No credentials and no extension identity → unauthenticated, not outdated extension.
    if (!extensionVersion) {
      throw unauthorized("Unauthorized - Please log in", "auth_required");
    }

    // Extension identified but version too low → upgrade required.
    if (isVersionBelow(extensionVersion, MIN_EXTENSION_VERSION)) {
      reply
        .code(426)
        .header("Upgrade", "X-Bondery-Extension-Version")
        .send({
          error: {
            code: "extension_outdated",
            details: {
              minVersion: MIN_EXTENSION_VERSION,
              storeUrl: CHROME_EXTENSION_URL,
            },
            doc_url: getErrorDocUrl("extension_outdated", websiteBaseUrl()),
            message: "Extension update required",
            request_id: request.id,
            type: "invalid_request_error",
          },
        });
      return;
    }
  });
}
