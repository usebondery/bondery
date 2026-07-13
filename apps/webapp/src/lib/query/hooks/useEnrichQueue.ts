"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  discardEnrichQueue,
  getEnrichQueueCount,
  getEnrichQueueStatus,
} from "@/lib/api/domains/enrichQueue";
import { invalidateAfterEnrichBatch } from "@/lib/query/invalidation";
import { enrichQueueKeys } from "@/lib/query/keys";

export function useEnrichQueueCountQuery() {
  return useQuery({
    queryFn: getEnrichQueueCount,
    queryKey: enrichQueueKeys.count(),
    staleTime: 2 * 60_000,
  });
}

export function useEnrichQueueStatusQuery() {
  return useQuery({
    queryFn: getEnrichQueueStatus,
    queryKey: enrichQueueKeys.status(),
  });
}

export function useDiscardEnrichQueueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: discardEnrichQueue,
    onSuccess: async () => {
      await Promise.all([
        invalidateAfterEnrichBatch(queryClient),
        queryClient.invalidateQueries({ queryKey: enrichQueueKeys.status() }),
        queryClient.invalidateQueries({ queryKey: enrichQueueKeys.count() }),
      ]);
    },
  });
}
