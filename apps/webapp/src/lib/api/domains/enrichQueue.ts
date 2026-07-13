import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { EnrichQueueStatusCounts } from "@bondery/schemas";
import { clientApiFetch, clientApiJson } from "@/lib/api/client";
import {
  ENRICH_QUEUE_COUNT_PATH,
  ENRICH_QUEUE_STATUS_PATH,
  type EnrichQueueStatus,
  parseEnrichQueueCount,
  parseEnrichQueueStatus,
} from "@/lib/api/resources/enrichQueue";

export type { EnrichQueueStatus };

export async function getEnrichQueueCount(): Promise<number> {
  const raw = await clientApiJson<{ eligibleCount: number }>(ENRICH_QUEUE_COUNT_PATH);
  return parseEnrichQueueCount(raw);
}

export async function getEnrichQueueStatus(): Promise<EnrichQueueStatus | null> {
  const raw = await clientApiJson<EnrichQueueStatusCounts>(ENRICH_QUEUE_STATUS_PATH);
  return parseEnrichQueueStatus(raw);
}

export async function discardEnrichQueue(): Promise<void> {
  await clientApiFetch(`${API_ROUTES.CONTACTS}/enrich-queue`, {
    method: "DELETE",
  });
}
