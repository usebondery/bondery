import "server-only";

import type { MergeRecommendation, MergeRecommendationsResponse } from "@bondery/schemas";
import {
  buildMergeRecommendationsPath,
  MERGE_RECOMMENDATIONS_COUNT_PATH,
  type MergeRecommendationsParams,
  parseMergeRecommendations,
  parseMergeRecommendationsCount,
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

export async function getMergeRecommendationsCountServer(
  options: ReadOptions = {},
): Promise<number> {
  const raw = await serverApiJson<{ activeCount: number }>(
    MERGE_RECOMMENDATIONS_COUNT_PATH,
    undefined,
    { ...MERGE_TAG, ...options },
  );
  return parseMergeRecommendationsCount(raw);
}
