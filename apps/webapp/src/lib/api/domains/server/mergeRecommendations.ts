import "server-only";

import type { MergeRecommendation, MergeRecommendationsResponse } from "@bondery/schemas";
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
import { type ServerApiFetchOptions, serverApiJson } from "@/lib/api/server";

type ReadOptions = Pick<ServerApiFetchOptions, "cache" | "next" | "transportPolicy">;

const MERGE_TAG = { next: { tags: ["merge-recommendations"] } } satisfies ServerApiFetchOptions;

export async function getMergeRecommendationsServer(
  params?: MergeRecommendationsParams,
  options: ReadOptions = {},
): Promise<MergeRecommendation[]> {
  const raw = await serverApiJson<MergeRecommendationsResponse>(
    buildMergeRecommendationsPath(params),
    undefined,
    { ...MERGE_TAG, ...options },
  );
  return parseMergeRecommendations(raw);
}

export async function getEnrichEligibleCountServer(options: ReadOptions = {}): Promise<number> {
  const raw = await serverApiJson<{ count?: number }>(ENRICH_ELIGIBLE_COUNT_PATH, undefined, {
    ...MERGE_TAG,
    ...options,
  });
  return parseEnrichEligibleCount(raw);
}

export async function getEnrichQueueStatusServer(
  options: ReadOptions = {},
): Promise<EnrichQueueStatus | null> {
  const raw = await serverApiJson<EnrichQueueStatus>(ENRICH_QUEUE_STATUS_PATH, undefined, {
    ...MERGE_TAG,
    ...options,
  });
  return parseEnrichQueueStatus(raw);
}
