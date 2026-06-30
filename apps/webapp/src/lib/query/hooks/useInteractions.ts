"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createInteraction,
  deleteInteraction,
  updateInteraction,
} from "@/lib/api/domains/interactions";
import { invalidateInteractionDomain } from "@/lib/query/invalidation";

export function useCreateInteractionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInteraction,
    onSuccess: async () => {
      await invalidateInteractionDomain(queryClient);
    },
  });
}

export function useUpdateInteractionMutation(interactionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => updateInteraction(interactionId, body),
    onSuccess: async () => {
      await invalidateInteractionDomain(queryClient);
    },
  });
}

export function useDeleteInteractionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteInteraction,
    onSuccess: async () => {
      await invalidateInteractionDomain(queryClient);
    },
  });
}
