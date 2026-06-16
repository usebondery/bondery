import type { Contact } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { appendAvatarParams } from "./avatarParams";

/**
 * Searches contacts by name on the server.
 * Intended as the `onSearch` prop of `PeopleMultiPickerInput` in contexts
 * that use same-origin requests (no credentials header needed).
 *
 * @param query - The search string to match against contact names.
 * @returns Up to 10 contacts matching the query, with small avatars. Returns
 *   an empty array on network or API error so the picker degrades gracefully.
 */
export async function searchContacts(query: string): Promise<Contact[]> {
  try {
    const params = new URLSearchParams();
    params.set("q", query);
    params.set("limit", "10");
    appendAvatarParams(params, "small");
    const res = await fetch(`${API_ROUTES.CONTACTS}?${params.toString()}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { contacts?: Contact[] };
    return data.contacts ?? [];
  } catch {
    return [];
  }
}
