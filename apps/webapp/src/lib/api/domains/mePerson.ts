import type { Contact } from "@bondery/schemas";
import { clientApiJson } from "@/lib/api/client";
import {
  buildMePersonPath,
  type MePersonApiResponse,
  parseMePerson,
} from "@/lib/api/resources/mePerson";
import type { AvatarPreset } from "@/lib/contacts/avatarParams";

export async function getMePerson(avatarPreset: AvatarPreset = "small"): Promise<Contact | null> {
  const raw = await clientApiJson<MePersonApiResponse>(buildMePersonPath(avatarPreset));
  return parseMePerson(raw);
}
