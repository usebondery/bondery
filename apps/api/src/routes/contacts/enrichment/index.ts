/**
 * Contacts — Enrichment Routes (index)
 * Orchestrates LinkedIn data, enrich, and enrich-queue sub-modules.
 */

import type { FastifyInstance } from "fastify";
import { registerLinkedInDataRoutes } from "./linkedin-data.js";
import { registerEnrichRoutes } from "./enrich.js";
import { registerEnrichQueueRoutes } from "./enrich-queue.js";

export function registerEnrichmentRoutes(fastify: FastifyInstance): void {
  registerLinkedInDataRoutes(fastify);
  registerEnrichRoutes(fastify);
  registerEnrichQueueRoutes(fastify);
}
