import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact } from "@bondery/types";
import { appendAvatarParams, type AvatarPreset } from "@/lib/avatarParams";

export interface KeepInTouchDataResult {
  contacts: Contact[];
}

/**
 * Fetches contacts that have a keep-in-touch frequency set and are not currently snoozed.
 *
 * @param precomputedHeaders - Optional pre-fetched auth headers to avoid redundant getAuthHeaders() calls.
 * @param avatarPreset - Avatar transform preset (small, medium, large).
 * @returns Contacts with keep-in-touch frequency configured.
 */
export async function getKeepInTouchData(
  precomputedHeaders?: HeadersInit,
  avatarPreset: AvatarPreset = "small",
): Promise<KeepInTouchDataResult> {
  const headers = precomputedHeaders ?? (await getAuthHeaders());
  const params = new URLSearchParams();
  params.set("limit", "200");
  params.set("offset", "0");
  params.set("keepInTouch", "true");

  appendAvatarParams(params, avatarPreset);

  const response = await fetch(`${API_URL}${API_ROUTES.CONTACTS}?${params.toString()}`, {
    next: { tags: ["contacts"] },
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch keep-in-touch contacts: ${response.status}`);
  }

  const data = await response.json();

  return {
    contacts: (data.contacts || []) as Contact[],
  };
}
