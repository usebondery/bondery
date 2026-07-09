import type { MergeRecommendation, MergeRecommendationsResponse } from "@bondery/schemas";
import { clientApiJson } from "@/lib/api/client";
import {
  buildMergeRecommendationsPath,
  ENRICH_ELIGIBLE_COUNT_PATH,
  ENRICH_QUEUE_STATUS_PATH,
  type EnrichQueueStatus,
  type MergeRecommendationsParams,
  parseEnrichEligibleCount,
  parseEnrichQueueStatus,
  parseMergeRecommendations,
} from "@/lib/api/resources/mergeRecommendations";

export type { EnrichQueueStatus, MergeRecommendationsParams };

export async function getMergeRecommendations(
  params?: MergeRecommendationsParams,
): Promise<MergeRecommendation[]> {
  const raw = await clientApiJson<MergeRecommendationsResponse>(
    buildMergeRecommendationsPath(params),
  );
  return parseMergeRecommendations(raw);
}

export async function getEnrichEligibleCount(): Promise<number> {
  const raw = await clientApiJson<{ count?: number }>(ENRICH_ELIGIBLE_COUNT_PATH);
  return parseEnrichEligibleCount(raw);
}

export async function getEnrichQueueStatus(): Promise<EnrichQueueStatus | null> {
  const raw = await clientApiJson<EnrichQueueStatus>(ENRICH_QUEUE_STATUS_PATH);
  return parseEnrichQueueStatus(raw);
}
