import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact } from "@bondery/schemas";
import { appendAvatarParams } from "@/lib/contacts/avatarParams";

export function buildKeepInTouchPath(): string {
  const params = new URLSearchParams();
  params.set("limit", "200");
  params.set("offset", "0");
  params.set("keepInTouch", "true");
  appendAvatarParams(params, "small");
  return `${API_ROUTES.CONTACTS}?${params.toString()}`;
}

export interface KeepInTouchResult {
  contacts: Contact[];
}

export type KeepInTouchApiResponse = { contacts?: Contact[] };

export function parseKeepInTouchContacts(raw: KeepInTouchApiResponse): KeepInTouchResult {
  return { contacts: (raw.contacts ?? []) as Contact[] };
}
