/**
 * Minimum Chrome extension version gate.
 *
 * The gate applies only to requests that identify as the extension through the
 * `X-Bondery-Extension-Version` header. Every other client (web app, mobile, MCP,
 * webhooks, CardDAV) sends no such header and passes through untouched.
 *
 * This hook does not authenticate. Route shells in `lib/platform/route-areas.ts`
 * own authentication, so the gate keeps no list of public paths.
 *
 * A route that an outdated extension must still reach (for example the manifest
 * that drives the "please update" nudge) declares `allowOutdatedExtension: true`
 * in its route config.
 */

import { CHROME_EXTENSION_URL, isVersionBelow, MIN_EXTENSION_VERSION } from "@bondery/helpers";
import { buildAgentMessage, getErrorDocUrl } from "@bondery/schemas/errors";
import { URLS } from "../platform/config.js";
import type { AppFastifyInstance } from "../platform/fastify-types.js";

declare module "fastify" {
  interface FastifyContextConfig {
    /** When true, an extension below the minimum version may still call the route. */
    allowOutdatedExtension?: boolean;
  }
}

/** Header the extension sends on every API call. Node lowercases header names. */
const EXTENSION_VERSION_HEADER = "x-bondery-extension-version";

/** A minimum of `0.0.0` (or empty) turns enforcement off. */
const UNENFORCED_MINIMUM = "0.0.0";

const TRAILING_SLASH_PATTERN = /\/$/;

function websiteBaseUrl(): string {
  return (URLS.website ?? "https://usebondery.com").replace(TRAILING_SLASH_PATTERN, "");
}

type ExtensionVersionCheckOptions = {
  /** Lowest extension version the API accepts. Defaults to the build-time constant. */
  minVersion?: string;
};

export { EXTENSION_VERSION_HEADER };

/**
 * Registers a global `onRequest` hook that answers `426 extension_outdated` to an
 * extension below the minimum version, whether or not the request is authenticated.
 */
export function registerExtensionVersionCheck(
  fastify: AppFastifyInstance,
  { minVersion = MIN_EXTENSION_VERSION }: ExtensionVersionCheckOptions = {},
): void {
  if (!minVersion || minVersion === UNENFORCED_MINIMUM) {
    return;
  }

  fastify.addHook("onRequest", async (request, reply) => {
    const extensionVersion = request.headers[EXTENSION_VERSION_HEADER];

    // Not the extension: nothing to gate.
    if (typeof extensionVersion !== "string") {
      return;
    }

    // An unknown path keeps its 404, and an opted-out route stays reachable.
    if (!request.routeOptions.url || request.routeOptions.config?.allowOutdatedExtension) {
      return;
    }

    if (!isVersionBelow(extensionVersion, minVersion)) {
      return;
    }

    return reply
      .code(426)
      .header("Upgrade", "X-Bondery-Extension-Version")
      .send({
        error: {
          agent_message: buildAgentMessage("extension_outdated", "Extension update required"),
          code: "extension_outdated",
          details: {
            minVersion,
            storeUrl: CHROME_EXTENSION_URL,
          },
          doc_url: getErrorDocUrl("extension_outdated", websiteBaseUrl()),
          message: "Extension update required",
          request_id: request.id,
          type: "invalid_request_error",
        },
      });
  });
}
