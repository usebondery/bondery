/**
 * Extension API Routes
 * Handles browser extension integration for creating/updating contacts
 */

import type { FastifyInstance } from "fastify";
import { registerPostRoute } from "./post-route.js";
import { registerGetRoute } from "./get-route.js";

export async function extensionRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Extension"] };
  });

  registerPostRoute(fastify);
  registerGetRoute(fastify);
}
