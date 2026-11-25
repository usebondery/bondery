import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";

import {
  fetchMergeRecommendations,
  prefetchEnrichQueueCount,
  prefetchEnrichQueueStatus,
} from "@/lib/query/prefetch";
import { FixClient } from "./FixClient";

export async function FixLoader() {
  const queryClient = getQueryClient();

  await Promise.all([
    fetchMergeRecommendations(queryClient, { declined: false }),
    prefetchEnrichQueueCount(queryClient),
    prefetchEnrichQueueStatus(queryClient),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FixClient />
    </HydrationBoundary>
  );
}

export type { MergeRecommendation } from "@bondery/schemas";
