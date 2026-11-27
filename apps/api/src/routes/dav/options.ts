import type { FastifyReply } from "fastify";
import {
  DAV_ALLOWED_METHODS,
  DAV_COMPLIANCE_HEADER,
  DAV_ROUTE_CONFIG,
} from "../../lib/dav/protocol.js";
import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";

function describeCapabilities(_request: unknown, reply: FastifyReply): FastifyReply {
  return reply
    .code(200)
    .header("DAV", DAV_COMPLIANCE_HEADER)
    .header("Allow", DAV_ALLOWED_METHODS.join(", "))
    .send();
}

/**
 * `OPTIONS /dav/` and `OPTIONS /dav/*`. A DAV client probes capabilities before it signs in,
 * so these answer without credentials. The response carries no user data. Mounted with
 * `openApiAreaRoutes("dav", …)`, not the authenticated `davRoutes` shell.
 */
export const davOptionsRoutes: AppRoutePlugin = async (fastify) => {
  for (const url of ["/", "/*"]) {
    fastify.route({
      config: DAV_ROUTE_CONFIG,
      handler: describeCapabilities,
      method: "OPTIONS",
      schema: { hide: true },
      url,
    });
  }
};
