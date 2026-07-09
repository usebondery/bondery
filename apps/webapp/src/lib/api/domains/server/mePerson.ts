import "server-only";

import type { Contact } from "@bondery/schemas";
import {
  buildMePersonPath,
  type MePersonApiResponse,
  parseMePerson,
} from "@/lib/api/resources/mePerson";
import { type ServerApiFetchOptions, serverApiJson } from "@/lib/api/server";
import type { AvatarPreset } from "@/lib/contacts/avatarParams";

type ReadOptions = Pick<ServerApiFetchOptions, "cache" | "next" | "transportPolicy">;

const CONTACTS_TAG = { next: { tags: ["contacts"] } } satisfies ServerApiFetchOptions;

export async function getMePersonServer(
  avatarPreset: AvatarPreset = "small",
  options: ReadOptions = {},
): Promise<Contact | null> {
  const raw = await serverApiJson<MePersonApiResponse>(buildMePersonPath(avatarPreset), undefined, {
    ...CONTACTS_TAG,
    ...options,
  });
  return parseMePerson(raw);
}
