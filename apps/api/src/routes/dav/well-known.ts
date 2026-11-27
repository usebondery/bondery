import { API_ROUTES } from "@bondery/helpers";
import { registerDiscardBodyParser } from "../../lib/dav/discard-body-parser.js";
import { DAV_ROUTE_CONFIG } from "../../lib/dav/protocol.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";

const TRAILING_SLASHES_PATTERN = /\/+$/;

/**
 * RFC 6764 discovery: `/.well-known/carddav` redirects to the DAV root on the host that serves
 * the request. The target comes from `BONDERY_PUBLIC_API_URL`, so beta and production each
 * point at themselves. No credentials: clients probe this before they sign in, and some drop
 * credentials on a redirect anyway. Mounted with `openApiAreaRoutes("internal", …)`.
 */
export const davWellKnownRoutes: AppRoutePlugin = async (fastify) => {
  registerDiscardBodyParser(fastify);

  const location = `${fastify.config.BONDERY_PUBLIC_API_URL.replace(TRAILING_SLASHES_PATTERN, "")}${API_ROUTES.DAV}/`;

  fastify.route({
    config: DAV_ROUTE_CONFIG,
    handler: async (_request, reply) => reply.redirect(location, 301),
    method: ["GET", "HEAD", "PROPFIND"],
    schema: { hide: true },
    url: "/",
  });
};
