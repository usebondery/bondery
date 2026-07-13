import type { MergeRecommendation } from "@bondery/schemas";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";

import {
  prefetchEnrichQueueCount,
  prefetchEnrichQueueStatus,
  prefetchMergeRecommendations,
} from "@/lib/query/prefetch";
import { FixClient } from "./FixClient";

export async function FixLoader() {
  const queryClient = getQueryClient();

  await Promise.all([
    prefetchMergeRecommendations(queryClient, { declined: false }),
    prefetchEnrichQueueCount(queryClient),
    prefetchEnrichQueueStatus(queryClient),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FixClient />
    </HydrationBoundary>
  );
}

export type { MergeRecommendation };
