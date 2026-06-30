import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import type { MergeRecommendation } from "@bondery/schemas";

import { FixContactsClient } from "./FixContactsClient";

import {
  createEnrichEligibleCountQueryFn,
  createEnrichQueueStatusQueryFn,
  createMergeRecommendationsQueryFn,
} from "@/lib/query/fetchers/serverQueryFns";

import { mergeRecommendationKeys } from "@/lib/query/keys";

import { getQueryClient } from "@/lib/query/client";



export async function FixContactsLoader() {

  const queryClient = getQueryClient();



  await Promise.all([

    queryClient.prefetchQuery({

      queryKey: mergeRecommendationKeys.list({ declined: false }),

      queryFn: createMergeRecommendationsQueryFn({ declined: false }),

    }),

    queryClient.prefetchQuery({

      queryKey: mergeRecommendationKeys.enrichEligibleCount(),

      queryFn: createEnrichEligibleCountQueryFn(),

    }),

    queryClient.prefetchQuery({

      queryKey: mergeRecommendationKeys.enrichQueueStatus(),

      queryFn: createEnrichQueueStatusQueryFn(),

    }),

  ]);



  return (

    <HydrationBoundary state={dehydrate(queryClient)}>

      <FixContactsClient />

    </HydrationBoundary>

  );

}



export type { MergeRecommendation };


