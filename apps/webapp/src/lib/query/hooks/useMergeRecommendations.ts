"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptMergeRecommendation,
  declineMergeRecommendation,
  refreshMergeRecommendations,
  restoreMergeRecommendation,
} from "@/lib/api/domains/contacts";
import {
  createEnrichEligibleCountQueryFn,
  createEnrichQueueStatusQueryFn,
  createMergeRecommendationsQueryFn,
} from "@/lib/query/fetchers/mergeRecommendations";
import { mergeRecommendationKeys } from "@/lib/query/keys";
import { invalidateMergeRecommendationDomain } from "@/lib/query/invalidation";

export function useMergeRecommendationsQuery(declined = false) {
  return useQuery({
    queryKey: mergeRecommendationKeys.list({ declined }),
    queryFn: createMergeRecommendationsQueryFn({ declined }),
  });
}

export function useEnrichEligibleCountQuery() {
  return useQuery({
    queryKey: mergeRecommendationKeys.enrichEligibleCount(),
    queryFn: createEnrichEligibleCountQueryFn(),
  });
}

export function useEnrichQueueStatusQuery() {
  return useQuery({
    queryKey: mergeRecommendationKeys.enrichQueueStatus(),
    queryFn: createEnrichQueueStatusQueryFn(),
  });
}

export function useRefreshMergeRecommendationsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: refreshMergeRecommendations,
    onSuccess: async () => {
      await invalidateMergeRecommendationDomain(queryClient);
    },
  });
}

export function useRestoreMergeRecommendationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: restoreMergeRecommendation,
    onSuccess: async () => {
      await invalidateMergeRecommendationDomain(queryClient);
    },
  });
}

export function useDeclineMergeRecommendationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: declineMergeRecommendation,
    onSuccess: async () => {
      await invalidateMergeRecommendationDomain(queryClient);
    },
  });
}

export function useAcceptMergeRecommendationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: acceptMergeRecommendation,
    onSuccess: async () => {
      await invalidateMergeRecommendationDomain(queryClient);
    },
  });
}

/** Sidebar badge: active merge recommendations or enrich-eligible contacts exist. */
export function useHasActiveMergeRecommendationsBadge() {
  const recommendations = useMergeRecommendationsQuery(false);
  const eligibleCount = useEnrichEligibleCountQuery();
  const recs = recommendations.data ?? [];
  const count = eligibleCount.data ?? 0;
  return recs.length > 0 || count > 0;
}
