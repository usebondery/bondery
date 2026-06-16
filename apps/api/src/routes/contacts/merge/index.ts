/**
 * Contacts — Merge Routes (index)
 * Orchestrates merge recommendations and merge-execute sub-modules.
 */

import type { FastifyInstance } from "fastify";
import { registerRecommendationRoutes } from "./recommendations.js";
import { registerMergeExecuteRoute } from "./execute.js";

export function registerMergeRoutes(fastify: FastifyInstance): void {
  registerRecommendationRoutes(fastify);
  registerMergeExecuteRoute(fastify);
}
