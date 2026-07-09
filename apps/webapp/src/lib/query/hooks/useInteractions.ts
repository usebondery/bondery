"use client";

import type { Activity } from "@bondery/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createInteraction,
  deleteInteraction,
  getInteractionsList,
  type InteractionsListParams,
  updateInteraction,
} from "@/lib/api/domains/interactions";
import {
  invalidateContactInteractions,
  invalidateInteractionDomain,
} from "@/lib/query/invalidation";
import { interactionKeys } from "@/lib/query/keys";

export type { InteractionsListParams };

export function useInteractionsListQuery(params?: InteractionsListParams) {
  const listParams = params ?? { limit: 50, offset: 0 };

  return useQuery({
    queryFn: () => getInteractionsList(listParams),
    queryKey: interactionKeys.list(listParams),
  });
}

export function useCreateInteractionMutation(contactId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInteraction,

    onSuccess: async () => {
      await invalidateInteractionDomain(queryClient);

      if (contactId) {
        await invalidateContactInteractions(queryClient, contactId);
      }
    },
  });
}

export function useUpdateInteractionMutation(interactionId: string, contactId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: Record<string, unknown>) => updateInteraction(interactionId, body),

    onSuccess: async () => {
      await invalidateInteractionDomain(queryClient);

      if (contactId) {
        await invalidateContactInteractions(queryClient, contactId);
      }
    },
  });
}

export function useDeleteInteractionMutation(contactId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteInteraction,

    onSuccess: async () => {
      await invalidateInteractionDomain(queryClient);

      if (contactId) {
        await invalidateContactInteractions(queryClient, contactId);
      }
    },
  });
}

export type { Activity };
