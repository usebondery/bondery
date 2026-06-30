"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeOnboarding,
  deleteAccount,
  submitFeedback,
  updateSettings,
} from "@/lib/api/domains/settings";
import { settingsKeys } from "@/lib/query/keys";
import { invalidateSettings } from "@/lib/query/invalidation";
import { createClientFetcher } from "@/lib/query/fetchers/createClientFetcher";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { UpdateSettingsPatch } from "@/lib/api/domains/settings";
async function fetchSettingsClient() {
  const fetch = createClientFetcher();
  return fetch<{ data?: Record<string, unknown> }>(API_ROUTES.ME_SETTINGS);
}

export function useSettingsQuery(enabled = true) {
  return useQuery({
    queryKey: settingsKeys.me(),
    queryFn: fetchSettingsClient,
    enabled,
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateSettingsPatch) => updateSettings(patch),
    onSuccess: async () => {
      await invalidateSettings(queryClient);
    },
  });
}

export function useSubmitFeedbackMutation() {
  return useMutation({
    mutationFn: submitFeedback,
  });
}

export function useCompleteOnboardingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: completeOnboarding,
    onSuccess: async () => {
      await invalidateSettings(queryClient);
    },
  });
}

export function useDeleteAccountMutation() {
  return useMutation({
    mutationFn: deleteAccount,
  });
}
