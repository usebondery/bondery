/**
 * Contacts — Merge Routes (index)
 * Orchestrates merge recommendations and merge-execute sub-modules.
 */

import type { AppFastifyInstance } from "../../../lib/fastify-types";
import { registerRecommendationRoutes } from "./recommendations";
import { registerMergeExecuteRoute } from "./execute";

export function registerMergeRoutes(fastify: AppFastifyInstance): void {
  registerRecommendationRoutes(fastify);
  registerMergeExecuteRoute(fastify);
}
