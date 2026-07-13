import "server-only";

import type { EnrichQueueStatusCounts } from "@bondery/schemas";
import {
  ENRICH_QUEUE_COUNT_PATH,
  ENRICH_QUEUE_STATUS_PATH,
  type EnrichQueueStatus,
  parseEnrichQueueCount,
  parseEnrichQueueStatus,
} from "@/lib/api/resources/enrichQueue";
import { type ServerApiFetchOptions, serverApiJson } from "@/lib/api/server";

type ReadOptions = Pick<ServerApiFetchOptions, "cache" | "next" | "transportPolicy">;

const ENRICH_TAG = { next: { tags: ["enrich-queue"] } } satisfies ServerApiFetchOptions;

export async function getEnrichQueueCountServer(options: ReadOptions = {}): Promise<number> {
  const raw = await serverApiJson<{ eligibleCount: number }>(ENRICH_QUEUE_COUNT_PATH, undefined, {
    ...ENRICH_TAG,
    ...options,
  });
  return parseEnrichQueueCount(raw);
}

export async function getEnrichQueueStatusServer(
  options: ReadOptions = {},
): Promise<EnrichQueueStatus | null> {
  const raw = await serverApiJson<EnrichQueueStatusCounts>(ENRICH_QUEUE_STATUS_PATH, undefined, {
    ...ENRICH_TAG,
    ...options,
  });
  return parseEnrichQueueStatus(raw);
}
