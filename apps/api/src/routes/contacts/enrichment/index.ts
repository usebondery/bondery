/**
 * Contacts — Enrichment Routes (index)
 * Orchestrates LinkedIn data, enrich, and enrich-queue sub-modules.
 */

import type { AppFastifyInstance } from "../../../lib/fastify-types";
import { registerLinkedInDataRoutes } from "./linkedin-data";
import { registerEnrichRoutes } from "./enrich";
import { registerEnrichQueueRoutes } from "./enrich-queue";

export function registerEnrichmentRoutes(fastify: AppFastifyInstance): void {
  registerLinkedInDataRoutes(fastify);
  registerEnrichRoutes(fastify);
  registerEnrichQueueRoutes(fastify);
}
