import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { UpdateAccountInput, UpdateUserSettingsInput } from "@bondery/schemas";
import { clientApiJson } from "@/lib/api/client";

export interface UserSettingsPayload {
  data?: Record<string, unknown>;
}

export type UpdateSettingsPatch = UpdateUserSettingsInput | UpdateAccountInput;

export async function getSettings(): Promise<UserSettingsPayload> {
  return clientApiJson<UserSettingsPayload>(API_ROUTES.ME_SETTINGS);
}

export async function updateSettings(patch: UpdateSettingsPatch): Promise<UserSettingsPayload> {
  return clientApiJson<UserSettingsPayload>(API_ROUTES.ME_SETTINGS, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function submitFeedback(body: Record<string, unknown>): Promise<void> {
  await clientApiJson(API_ROUTES.ME_FEEDBACK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function completeOnboarding(): Promise<void> {
  await clientApiJson(API_ROUTES.ME_ONBOARDING_COMPLETE, {
    method: "PATCH",
  });
}

export async function deleteAccount(): Promise<void> {
  await clientApiJson(API_ROUTES.ME, {
    method: "DELETE",
  });
}
