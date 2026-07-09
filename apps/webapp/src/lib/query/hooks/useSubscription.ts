"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getSubscriptionStatus, syncSubscription } from "@/lib/api/domains/subscription";
import { invalidateSubscription } from "@/lib/query/invalidation";
import { settingsKeys } from "@/lib/query/keys";

export function useSubscriptionQuery(enabled = true) {
  return useQuery({
    enabled,

    queryFn: getSubscriptionStatus,
    queryKey: settingsKeys.subscription(),
  });
}

export function useSubscriptionSyncMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: syncSubscription,

    onSuccess: async () => {
      await invalidateSubscription(queryClient);
    },
  });
}
