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
import { refreshAppShell } from "@/lib/app/refreshAppShell";
import { invalidateSettings } from "@/lib/query/invalidation";
import { settingsKeys } from "@/lib/query/keys";

const SETTINGS_STALE_TIME_MS = 15 * 60_000;

function settingsPatchAffectsSession(patch: UpdateSettingsPatch): boolean {
  return (
    patch.colorScheme !== undefined ||
    patch.name !== undefined ||
    patch.middlename !== undefined ||
    patch.surname !== undefined ||
    patch.language !== undefined ||
    patch.timezone !== undefined ||
    patch.timeFormat !== undefined
  );
}

function sessionPatchFromSettingsUpdate(
  patch: UpdateSettingsPatch,
): Parameters<typeof refreshAppShell>[0] | undefined {
  if (patch.colorScheme !== undefined) {
    return { colorScheme: patch.colorScheme };
  }
  return undefined;
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
      if (settingsPatchAffectsSession(patch)) {
        refreshAppShell(sessionPatchFromSettingsUpdate(patch));
      }
    },
  });
}

export function useUploadMePhotoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadMePhoto,
    onSuccess: async () => {
      await invalidateSettings(queryClient);
      refreshAppShell();
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
    mutationFn: deleteAccount,
  });
}
