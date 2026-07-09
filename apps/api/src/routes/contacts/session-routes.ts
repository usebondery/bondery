/**
 * Session-only contact routes (merge, enrichment, relationships, etc.).
 * Mounted at the same prefix as integration contact routes.
 */

import type { AppRoutePlugin } from "../../lib/platform/fastify-types.js";
import { registerContactEnrichmentRoutes, registerEnrichQueueRoutes } from "./enrichment/index.js";
import { registerContactImportantDateRoutes } from "./important-dates/index.js";
import { registerMergeRoutes } from "./merge/index.js";
import { registerPhotoRoutes } from "./photo/index.js";
import { registerRelationshipRoutes } from "./relationships/index.js";
import { registerTagRoutes } from "./tags/index.js";

export const contactSessionRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Contacts"];
    }
  });

  registerTagRoutes(fastify);
  registerPhotoRoutes(fastify);
  registerRelationshipRoutes(fastify);
  registerContactImportantDateRoutes(fastify);
  registerContactEnrichmentRoutes(fastify);
  registerMergeRoutes(fastify);
  registerEnrichQueueRoutes(fastify);
};
