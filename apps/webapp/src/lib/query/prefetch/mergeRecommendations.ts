import type { QueryClient } from "@tanstack/react-query";
import {
  getEnrichEligibleCountServer,
  getEnrichQueueStatusServer,
  getMergeRecommendationsServer,
} from "@/lib/api/domains/server/mergeRecommendations";
import type { MergeRecommendationsParams } from "@/lib/api/resources/mergeRecommendations";
import { mergeRecommendationKeys } from "@/lib/query/keys";

export async function prefetchMergeRecommendations(
  queryClient: QueryClient,
  params?: MergeRecommendationsParams,
): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getMergeRecommendationsServer(params),
    queryKey: mergeRecommendationKeys.list(params ?? {}),
  });
}

export async function prefetchEnrichEligibleCount(queryClient: QueryClient): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getEnrichEligibleCountServer(),
    queryKey: mergeRecommendationKeys.enrichEligibleCount(),
  });
}

export async function prefetchEnrichQueueStatus(queryClient: QueryClient): Promise<void> {
  await queryClient.prefetchQuery({
    queryFn: () => getEnrichQueueStatusServer(),
    queryKey: mergeRecommendationKeys.enrichQueueStatus(),
  });
}
