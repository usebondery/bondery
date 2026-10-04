"use client";

import type { ImportFollowupPlatform } from "@bondery/schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { applyUserLocaleFromRef } from "@/components/shell/UserLocaleProvider";
import { applyUserSessionFromRef } from "@/components/shell/UserSessionProvider";
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
import { refreshAppShell } from "@/lib/app/refreshAppShell";
import { invalidateSettings } from "@/lib/query/invalidation";
import { settingsKeys } from "@/lib/query/keys";

const SETTINGS_STALE_TIME_MS = 15 * 60_000;

function applySettingsPatchToShell(patch: UpdateSettingsPatch): void {
  const timezone = "timezone" in patch ? patch.timezone : undefined;
  const timeFormat = "timeFormat" in patch ? patch.timeFormat : undefined;
  const language = "language" in patch ? patch.language : undefined;
  const colorScheme = "colorScheme" in patch ? patch.colorScheme : undefined;

  if (timezone !== undefined || timeFormat !== undefined || language !== undefined) {
    applyUserLocaleFromRef({
      ...(timezone !== undefined ? { timezone } : {}),
      ...(timeFormat !== undefined ? { timeFormat } : {}),
      ...(language !== undefined ? { locale: language } : {}),
    });
  }
  if (colorScheme !== undefined) {
    applyUserSessionFromRef({ colorScheme });
  }
}

export function useSettingsQuery(enabled = true) {
  return useQuery({
    enabled,
    queryFn: getSettings,
    queryKey: settingsKeys.me(),
    refetchOnWindowFocus: false,
    staleTime: SETTINGS_STALE_TIME_MS,
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateSettingsPatch) => updateSettings(patch),
    onSuccess: async (_data, patch) => {
      await invalidateSettings(queryClient);
      applySettingsPatchToShell(patch);
    },
  });
}

export function useUploadMePhotoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadMePhoto,
    onSuccess: async ({ avatarUrl }) => {
      await invalidateSettings(queryClient);
      if (avatarUrl) {
        applyUserSessionFromRef({ avatarUrl });
      }
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
      refreshAppShell();
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
      refreshAppShell();
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
    mutationFn: (stepUpToken: string) => deleteAccount(stepUpToken),
  });
}
