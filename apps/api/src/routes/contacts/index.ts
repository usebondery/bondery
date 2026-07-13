/**
 * Contacts API Routes
 * Handles CRUD operations for contacts
 */

import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { registerContactDetailRoutes } from "./detail-routes.js";
import { registerUpcomingImportantDateRoutes } from "./important-dates/index.js";
import { registerContactListRoutes } from "./list-routes.js";
import { registerContactLookupRoutes } from "./lookup-routes.js";
import { registerContactMapRoutes } from "./map-routes.js";
import { registerContactMutationRoutes } from "./mutation-routes.js";

export const contactIntegrationRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Contacts"];
    }
  });

  registerContactListRoutes(fastify);
  registerContactMutationRoutes(fastify);
  registerContactLookupRoutes(fastify);
  registerContactMapRoutes(fastify);
  registerUpcomingImportantDateRoutes(fastify);
  registerContactDetailRoutes(fastify);
};
