/**
 * Extension API Routes
 * Handles browser extension integration for creating/updating contacts.
 *
 * Composite mount: the contact upsert needs a session, while the manifest is
 * public so that an extension with no session (or an outdated one) can read it.
 */

import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { sessionRoutes } from "../../lib/platform/route-areas.js";
import { registerManifestRoute } from "./manifest-route.js";
import { registerPostRoute } from "./post-route.js";

export const extensionRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Extension"];
    }
  });

  await fastify.register(
    sessionRoutes(async (session) => {
      registerPostRoute(session);
    }),
  );
  registerManifestRoute(fastify);
};
