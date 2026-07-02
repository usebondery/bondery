/**
 * Contacts — Enrichment Routes (index)
 * Orchestrates LinkedIn data, enrich, and enrich-queue sub-modules.
 */

import type { AppFastifyInstance } from "../../../lib/fastify-types.js";
import { registerLinkedInDataRoutes } from "./linkedin-data.js";
import { registerEnrichRoutes } from "./enrich.js";
import { registerEnrichQueueRoutes } from "./enrich-queue.js";

/** Tier 4 — per-contact enrichment (`/:id/…`). */
export function registerContactEnrichmentRoutes(fastify: AppFastifyInstance): void {
  registerEnrichRoutes(fastify);
  registerLinkedInDataRoutes(fastify);
}

/** Tier 5 — batch enrich-queue workflows. */
export { registerEnrichQueueRoutes };

/** @deprecated Use registerContactEnrichmentRoutes + registerEnrichQueueRoutes at the correct tiers. */
export function registerEnrichmentRoutes(fastify: AppFastifyInstance): void {
  registerContactEnrichmentRoutes(fastify);
  registerEnrichQueueRoutes(fastify);
}
