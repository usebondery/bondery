import type {
  EnrichQueueInitBody,
  EnrichQueueInitResponse,
  EnrichQueueNextBatchItem,
  EnrichQueueNextBatchResponse,
  EnrichQueuePatchBody,
  EnrichQueueStatusCounts,
} from "@bondery/schemas";
import { clientApiJson } from "@/lib/api/client";
import {
  buildEnrichQueueInitPath,
  buildEnrichQueueItemPath,
  buildEnrichQueueNextBatchPath,
  buildEnrichQueuePath,
  ENRICH_QUEUE_COUNT_PATH,
  ENRICH_QUEUE_STATUS_PATH,
  type EnrichQueueStatus,
  parseEnrichQueueCount,
  parseEnrichQueueInit,
  parseEnrichQueueNextBatch,
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
  await clientApiJson(buildEnrichQueuePath(), {
    method: "DELETE",
  });
}

export async function initEnrichQueue(
  body?: EnrichQueueInitBody,
): Promise<EnrichQueueInitResponse> {
  const raw = await clientApiJson<EnrichQueueInitResponse>(buildEnrichQueueInitPath(), {
    body: JSON.stringify(body ?? {}),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  return parseEnrichQueueInit(raw);
}

export async function fetchNextEnrichBatch(): Promise<EnrichQueueNextBatchItem[]> {
  const raw = await clientApiJson<EnrichQueueNextBatchResponse>(buildEnrichQueueNextBatchPath());
  return parseEnrichQueueNextBatch(raw);
}

export async function patchEnrichQueueItem(
  queueItemId: string,
  body: EnrichQueuePatchBody,
): Promise<void> {
  await clientApiJson(buildEnrichQueueItemPath(queueItemId), {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}
