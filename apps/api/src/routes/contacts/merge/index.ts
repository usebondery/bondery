/**
 * Contacts — Merge Routes (index)
 * Orchestrates merge recommendations and merge-execute sub-modules.
 */

import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { registerMergeExecuteRoute } from "./execute.js";
import { registerRecommendationRoutes } from "./recommendations.js";

export function registerMergeRoutes(fastify: AppFastifyInstance): void {
  registerRecommendationRoutes(fastify);
  registerMergeExecuteRoute(fastify);
}
