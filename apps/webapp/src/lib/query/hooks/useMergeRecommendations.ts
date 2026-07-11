"use client";

import type { MergeRecommendation } from "@bondery/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  declineMergeRecommendation,
  getMergeRecommendations,
  getMergeRecommendationsCount,
  refreshMergeRecommendations,
  restoreMergeRecommendation,
} from "@/lib/api/domains/mergeRecommendations";
import { invalidateContactsAttention } from "@/lib/query/invalidation";
import { mergeRecommendationKeys } from "@/lib/query/keys";
import { PERSON_MERGE_RECOMMENDATIONS } from "@/lib/query/personPageQueryParams";

export function useMergeRecommendationsQuery(declined = false) {
  return useQuery({
    queryFn: () => getMergeRecommendations({ declined }),
    queryKey: mergeRecommendationKeys.list({ declined }),
  });
}

export function useMergeRecommendationsCountQuery() {
  return useQuery({
    queryFn: getMergeRecommendationsCount,
    queryKey: mergeRecommendationKeys.count(),
    staleTime: 2 * 60_000,
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

export function useRefreshMergeRecommendationsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: refreshMergeRecommendations,
    onSuccess: async () => {
      await invalidateContactsAttention(queryClient);
    },
  });
}

export function useRestoreMergeRecommendationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreMergeRecommendation,
    onSuccess: async () => {
      await invalidateContactsAttention(queryClient);
    },
  });
}

export function useDeclineMergeRecommendationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: declineMergeRecommendation,
    onSuccess: async () => {
      await invalidateContactsAttention(queryClient);
    },
  });
}

export type { MergeRecommendation };
