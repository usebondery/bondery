import { API_ROUTES } from "@bondery/helpers";
import { config } from "../../../config";
import { authenticatedFetch } from "../transport";

export interface UserSettingsProfile {
  avatarUrl: string | null;
  email: string | null;
  id?: string;
  name: string | null;
}

export async function fetchUserSettings(): Promise<UserSettingsProfile> {
  const response = await authenticatedFetch(`${config.apiUrl}${API_ROUTES.ME_SETTINGS}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  const result = await response.json();
  const settings = result?.data ?? {};

  return {
    avatarUrl: settings.avatarUrl ?? null,
    email: settings.email ?? null,
    id: settings.id ?? undefined,
    name: settings.name ?? null,
  };
}
