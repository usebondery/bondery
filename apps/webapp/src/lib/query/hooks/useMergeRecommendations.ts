"use client";

import type { MergeRecommendation } from "@bondery/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  acceptMergeRecommendation,
  declineMergeRecommendation,
  discardEnrichQueue,
  refreshMergeRecommendations,
  restoreMergeRecommendation,
} from "@/lib/api/domains/contacts";

import {
  getEnrichEligibleCount,
  getEnrichQueueStatus,
  getMergeRecommendations,
} from "@/lib/api/domains/mergeRecommendations";
import {
  invalidateAfterEnrichBatch,
  invalidateMergeRecommendationDomain,
} from "@/lib/query/invalidation";

import { mergeRecommendationKeys } from "@/lib/query/keys";
import { PERSON_MERGE_RECOMMENDATIONS } from "@/lib/query/personPageQueryParams";

export function useMergeRecommendationsQuery(declined = false) {
  return useQuery({
    queryFn: () => getMergeRecommendations({ declined }),
    queryKey: mergeRecommendationKeys.list({ declined }),
  });
}

export function useContactMergeRecommendation(contactId: string, enabled = true) {
  return useQuery({
    enabled: enabled && !!contactId,

    queryFn: () => getMergeRecommendations(PERSON_MERGE_RECOMMENDATIONS),
    queryKey: mergeRecommendationKeys.list(PERSON_MERGE_RECOMMENDATIONS),

    select: (recommendations): MergeRecommendation | null =>
      recommendations.find(
        (rec) => rec.leftPerson.id === contactId || rec.rightPerson.id === contactId,
      ) ?? null,
  });
}

export function useEnrichEligibleCountQuery() {
  return useQuery({
    queryFn: getEnrichEligibleCount,
    queryKey: mergeRecommendationKeys.enrichEligibleCount(),
  });
}

export function useEnrichQueueStatusQuery() {
  return useQuery({
    queryFn: getEnrichQueueStatus,
    queryKey: mergeRecommendationKeys.enrichQueueStatus(),
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

export function useDiscardEnrichQueueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: discardEnrichQueue,

    onSuccess: async () => {
      await Promise.all([
        invalidateAfterEnrichBatch(queryClient),

        queryClient.invalidateQueries({ queryKey: mergeRecommendationKeys.enrichQueueStatus() }),

        queryClient.invalidateQueries({ queryKey: mergeRecommendationKeys.enrichEligibleCount() }),
      ]);
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
