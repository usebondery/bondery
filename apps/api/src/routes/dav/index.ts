import type { FastifyReply } from "fastify";
import { registerDiscardBodyParser } from "../../lib/dav/discard-body-parser.js";
import { DAV_ROUTE_CONFIG, DAV_SHELL_METHODS } from "../../lib/dav/protocol.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { DAV_TIER } from "../../lib/platform/rate-limit.js";

function notImplemented(_request: unknown, reply: FastifyReply): FastifyReply {
  return reply.code(501).send();
}

/**
 * Every CardDAV method behind the `davRoutes` shell, which has already verified the device
 * key. The address book handlers arrive in a later milestone and replace this catch-all.
 * Until then an authenticated request gets 501 with an empty body.
 */
export const davCollectionRoutes: AppRoutePlugin = async (fastify) => {
  registerDiscardBodyParser(fastify);

  for (const url of ["/", "/*"]) {
    fastify.route({
      config: { ...DAV_ROUTE_CONFIG, rateLimit: DAV_TIER },
      handler: notImplemented,
      method: [...DAV_SHELL_METHODS],
      schema: { hide: true },
      url,
    });
  }
};
