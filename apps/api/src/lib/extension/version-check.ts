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

import {
  API_ROUTES,
  CHROME_EXTENSION_URL,
  isVersionBelow,
  MIN_EXTENSION_VERSION,
} from "@bondery/helpers";
import { BETTER_AUTH_BASE_PATH, publicOAuthDiscoveryPaths } from "@bondery/helpers/globals/paths";
import { getErrorDocUrl } from "@bondery/schemas/errors";
import { URLS } from "../platform/config.js";
import { unauthorized } from "../platform/errors/http-errors.js";
import type { AppFastifyInstance } from "../platform/fastify-types.js";

function websiteBaseUrl(): string {
  return (URLS.website ?? "https://usebondery.com").replace(/\/$/, "");
}

function isPublicInfraPath(url: string): boolean {
  const path = url.split("?")[0] ?? url;
  return (
    path.startsWith("/health/") ||
    path === "/extension/manifest" ||
    path === API_ROUTES.OAUTH_PROVIDERS ||
    path === API_ROUTES.API_REFERENCE ||
    path === API_ROUTES.DOCS_API
  );
}

function isPublicAuthPath(url: string): boolean {
  const path = url.split("?")[0] ?? url;
  if (
    path === BETTER_AUTH_BASE_PATH ||
    path.startsWith(`${BETTER_AUTH_BASE_PATH}/`) ||
    publicOAuthDiscoveryPaths().includes(path) ||
    path === API_ROUTES.WELL_KNOWN_MCP ||
    path === `${API_ROUTES.WELL_KNOWN_MCP}/`
  ) {
    return true;
  }

  // Unauthenticated MCP clients start OAuth from GET/HEAD/POST /mcp (401 + RFC 9728).
  return path === API_ROUTES.MCP || path.startsWith(`${API_ROUTES.MCP}/`);
}

function isPublicWebhookPath(url: string): boolean {
  const path = url.split("?")[0] ?? url;
  return path.startsWith("/webhooks/") || path.startsWith("/api/webhooks/");
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

    // Skip unauthenticated health-check routes and public Better Auth / OIDC discovery
    if (isPublicInfraPath(request.url) || isPublicAuthPath(request.url)) {
      return;
    }

    // Inbound webhooks authenticate via HMAC in the route handler, not session cookies.
    if (isPublicWebhookPath(request.url)) {
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
