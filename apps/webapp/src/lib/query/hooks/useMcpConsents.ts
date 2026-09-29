"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMcpConsents, revokeMcpConsent } from "@/lib/api/domains/mcpConsents";
import { invalidateMcpConsents } from "@/lib/query/invalidation";
import { settingsKeys } from "@/lib/query/keys";

export function useMcpConsentsQuery(enabled = true) {
  return useQuery({
    enabled,
    queryFn: getMcpConsents,
    queryKey: settingsKeys.mcpConsents(),
  });
}

export function useRevokeMcpConsentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => revokeMcpConsent(id),
    onSuccess: async () => {
      await invalidateMcpConsents(queryClient);
    },
  });
}
