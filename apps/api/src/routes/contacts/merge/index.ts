/**
 * Contacts — Merge Routes (index)
 * Orchestrates merge recommendations and merge-execute sub-modules.
 */

import type { AppFastifyInstance } from "../../../lib/fastify-types.js";
import { registerRecommendationRoutes } from "./recommendations.js";
import { registerMergeExecuteRoute } from "./execute.js";

export function registerMergeRoutes(fastify: AppFastifyInstance): void {
  registerRecommendationRoutes(fastify);
  registerMergeExecuteRoute(fastify);
}
