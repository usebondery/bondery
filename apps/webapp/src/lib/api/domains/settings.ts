import { API_ROUTES, BONDERY_STEP_UP_HEADER } from "@bondery/helpers/globals/paths";
import type {
  FeedbackFormInput,
  UpdateAccountInput,
  UpdateUserSettingsInput,
} from "@bondery/schemas";
import { clientApiJson } from "@/lib/api/client";
import {
  parseSettingsQueryResult,
  SETTINGS_API_PATH,
  type SettingsQueryResult,
} from "@/lib/api/resources/settings";

export type UserSettingsPayload = SettingsQueryResult;

export type UpdateSettingsPatch = UpdateUserSettingsInput | UpdateAccountInput;

export async function getSettings(): Promise<UserSettingsPayload> {
  const raw = await clientApiJson<SettingsQueryResult>(SETTINGS_API_PATH);
  return parseSettingsQueryResult(raw);
}

export async function updateSettings(patch: UpdateSettingsPatch): Promise<UserSettingsPayload> {
  return clientApiJson<UserSettingsPayload>(API_ROUTES.ME_SETTINGS, {
    body: JSON.stringify(patch),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

export async function submitFeedback(body: FeedbackFormInput): Promise<void> {
  await clientApiJson(API_ROUTES.ME_FEEDBACK, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export async function completeOnboarding(): Promise<void> {
  await clientApiJson(API_ROUTES.ME_ONBOARDING_COMPLETE, {
    method: "PATCH",
  });
}

export async function updateImportFollowup(body: {
  status: "awaiting_export" | "dismissed";
  platform?: "linkedin" | "instagram";
}): Promise<void> {
  await clientApiJson(API_ROUTES.ME_ONBOARDING_IMPORT_FOLLOWUP, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

export async function dismissGettingStarted(): Promise<void> {
  await clientApiJson(API_ROUTES.ME_SETTINGS_GETTING_STARTED_DISMISS, {
    method: "PATCH",
  });
}

export async function deleteAccount(stepUpToken: string): Promise<void> {
  await clientApiJson(API_ROUTES.ME, {
    headers: { [BONDERY_STEP_UP_HEADER]: stepUpToken },
    method: "DELETE",
  });
}

export async function uploadMePhoto(file: File): Promise<{ avatarUrl: string | null }> {
  const formData = new FormData();
  formData.append("file", file);

  const body = await clientApiJson<{ data?: { avatarUrl?: string } }>(API_ROUTES.ME_PHOTO, {
    body: formData,
    method: "POST",
  });
  return { avatarUrl: body.data?.avatarUrl ?? null };
}
