"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateApiKeyInput, UpdateApiKeyLabelInput } from "@bondery/schemas";
import {
  createApiKey,
  deleteApiKey,
  updateApiKeyLabel,
} from "@/lib/api/domains/apiKeys";
import { settingsKeys } from "@/lib/query/keys";
import { invalidateApiKeys } from "@/lib/query/invalidation";

export function useCreateApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateApiKeyInput) => createApiKey(body),
    onSuccess: async () => {
      await invalidateApiKeys(queryClient);
    },
  });
}

export function useUpdateApiKeyLabelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateApiKeyLabelInput }) =>
      updateApiKeyLabel(id, patch),
    onSuccess: async () => {
      await invalidateApiKeys(queryClient);
    },
  });
}

export function useDeleteApiKeyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteApiKey(id),
    onSuccess: async () => {
      await invalidateApiKeys(queryClient);
    },
  });
}

export { settingsKeys };
