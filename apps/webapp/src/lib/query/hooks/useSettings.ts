"use client";

import type { ImportFollowupPlatform } from "@bondery/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateSettingsPatch } from "@/lib/api/domains/settings";
import {
  completeOnboarding,
  deleteAccount,
  dismissGettingStarted,
  getSettings,
  submitFeedback,
  updateImportFollowup,
  updateSettings,
  uploadMePhoto,
} from "@/lib/api/domains/settings";
import { invalidateSettings } from "@/lib/query/invalidation";
import { settingsKeys } from "@/lib/query/keys";

export function useSettingsQuery(enabled = true) {
  return useQuery({
    enabled,
    queryFn: getSettings,
    queryKey: settingsKeys.me(),
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

export function useUploadMePhotoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadMePhoto,
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

export function useUpdateImportFollowupMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateImportFollowup,
    onSuccess: async () => {
      await invalidateSettings(queryClient);
    },
  });
}

export type FinishOnboardingInput =
  | {
      status: "awaiting_export" | "dismissed";
      platform?: ImportFollowupPlatform;
    }
  | undefined;

export function useFinishOnboardingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (followup?: FinishOnboardingInput) => {
      if (followup) {
        await updateImportFollowup(followup);
      }
      await completeOnboarding();
    },
    onSuccess: async () => {
      await invalidateSettings(queryClient);
    },
  });
}

export function useDismissGettingStartedMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dismissGettingStarted,
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
