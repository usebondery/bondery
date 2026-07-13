/**
 * Contacts — Enrichment Routes (index)
 * Orchestrates LinkedIn data, enrich, and enrich-queue sub-modules.
 */

import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { registerEnrichRoutes } from "./enrich.js";
import { registerEnrichQueueRoutes } from "./enrich-queue.js";
import { registerLinkedInDataRoutes } from "./linkedin-data.js";

/** Tier 4 — per-contact enrichment (`/:id/…`). */
export function registerContactEnrichmentRoutes(fastify: AppFastifyInstance): void {
  registerEnrichRoutes(fastify);
  registerLinkedInDataRoutes(fastify);
}

/** Tier 5 — batch enrich-queue workflows. */
export { registerEnrichQueueRoutes };
