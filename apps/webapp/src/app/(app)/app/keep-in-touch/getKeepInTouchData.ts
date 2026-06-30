import { serverApiJson } from "@/lib/api/server";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact } from "@bondery/schemas";
import { appendAvatarParams, type AvatarPreset } from "@/lib/avatarParams";

export interface KeepInTouchDataResult {
  contacts: Contact[];
}

interface ContactsApiResponse {
  contacts?: Contact[];
}

/**
 * Fetches contacts that have a keep-in-touch frequency set and are not currently snoozed.
 *
 * @param avatarPreset - Avatar transform preset (small, medium, large).
 * @returns Contacts with keep-in-touch frequency configured.
 */
export async function getKeepInTouchData(
  avatarPreset: AvatarPreset = "small",
): Promise<KeepInTouchDataResult> {
  const params = new URLSearchParams();
  params.set("limit", "200");
  params.set("offset", "0");
  params.set("keepInTouch", "true");

  appendAvatarParams(params, avatarPreset);

  const data = await serverApiJson<ContactsApiResponse>(
    `${API_ROUTES.CONTACTS}?${params.toString()}`,
    undefined,
    { next: { tags: ["contacts"] } },
  );

  return {
    contacts: (data.contacts || []) as Contact[],
  };
}
