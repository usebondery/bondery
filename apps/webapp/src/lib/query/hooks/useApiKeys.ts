"use client";

import type { CreateApiKeyInput, UpdateApiKeyLabelInput } from "@bondery/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createApiKey,
  deleteApiKey,
  getApiKeys,
  updateApiKeyLabel,
} from "@/lib/api/domains/apiKeys";
import { invalidateApiKeys } from "@/lib/query/invalidation";
import { settingsKeys } from "@/lib/query/keys";

export function useApiKeysQuery(enabled = true) {
  return useQuery({
    enabled,

    queryFn: getApiKeys,
    queryKey: settingsKeys.apiKeys(),
  });
}

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
