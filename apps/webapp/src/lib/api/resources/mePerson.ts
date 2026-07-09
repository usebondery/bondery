import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact } from "@bondery/schemas";
import type { AvatarPreset } from "@/lib/contacts/avatarParams";
import { appendAvatarParams } from "@/lib/contacts/avatarParams";

export function buildMePersonPath(avatarPreset: AvatarPreset = "small"): string {
  const params = new URLSearchParams();
  appendAvatarParams(params, avatarPreset);
  return `${API_ROUTES.ME_PERSON}?${params.toString()}`;
}

export type MePersonApiResponse = { contact?: Contact | null };

export function parseMePerson(raw: MePersonApiResponse): Contact | null {
  return raw.contact ?? null;
}
