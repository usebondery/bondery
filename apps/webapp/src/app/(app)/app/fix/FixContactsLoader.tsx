import type { MergeRecommendation } from "@bondery/schemas";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/query/client";

import {
  prefetchEnrichEligibleCount,
  prefetchEnrichQueueStatus,
  prefetchMergeRecommendations,
} from "@/lib/query/prefetch";
import { FixContactsClient } from "./FixContactsClient";

export async function FixContactsLoader() {
  const queryClient = getQueryClient();

  await Promise.all([
    prefetchMergeRecommendations(queryClient, { declined: false }),
    prefetchEnrichEligibleCount(queryClient),
    prefetchEnrichQueueStatus(queryClient),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FixContactsClient />
    </HydrationBoundary>
  );
}

export type { MergeRecommendation };
