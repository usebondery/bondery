"use client";

import type { Activity } from "@bondery/schemas";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  invalidateKeepInTouchCount,
} from "@/lib/query/invalidation";
import { interactionKeys } from "@/lib/query/keys";
import { INTERACTIONS_TIMELINE } from "@/lib/query/sharedListParams";

export type { InteractionsListParams };

export const INTERACTIONS_PAGE_SIZE = INTERACTIONS_TIMELINE.limit;

export function useInteractionsListQuery(params?: InteractionsListParams) {
  const listParams = params ?? INTERACTIONS_TIMELINE;

  return useQuery({
    queryFn: () => getInteractionsList(listParams),
    queryKey: interactionKeys.list(listParams),
  });
}

export function useInteractionsInfiniteQuery() {
  const infiniteParams = { limit: INTERACTIONS_PAGE_SIZE };

  return useInfiniteQuery({
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination.hasMore) {
        return undefined;
      }
      return lastPage.pagination.offset + lastPage.pagination.limit;
    },
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      getInteractionsList({
        limit: INTERACTIONS_PAGE_SIZE,
        offset: pageParam as number,
      }),
    queryKey: interactionKeys.infinite(infiniteParams),
  });
}

export function useCreateInteractionMutation(contactId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInteraction,

    onSuccess: async () => {
      await Promise.all([
        invalidateInteractionDomain(queryClient),
        invalidateKeepInTouchCount(queryClient),
      ]);

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
      await Promise.all([
        invalidateInteractionDomain(queryClient),
        invalidateKeepInTouchCount(queryClient),
      ]);

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
      await Promise.all([
        invalidateInteractionDomain(queryClient),
        invalidateKeepInTouchCount(queryClient),
      ]);

      if (contactId) {
        await invalidateContactInteractions(queryClient, contactId);
      }
    },
  });
}

export type { Activity };
