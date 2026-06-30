import { serverApiJson } from "@/lib/api/server";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact } from "@bondery/schemas";
import { appendAvatarParams, type AvatarPreset } from "@/lib/avatarParams";
import {
  normalizeContactsList,
  type ContactsDataResult,
  type SortOrder,
  type ContactsApiResponse,
} from "@/lib/query/fetchers/contacts";

export type { SortOrder, ContactsDataResult, ContactsStats } from "@/lib/query/fetchers/contacts";

/**
 * @deprecated Use lib/query fetchers directly. Shim for unmigrated server code.
 */
export async function getContactsData(
  query?: string,
  sort?: SortOrder,
  limit = 50,
  offset = 0,
  avatarPreset: AvatarPreset = "small",
): Promise<ContactsDataResult> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (query) params.set("search", query);
  if (sort) params.set("sort", sort);
  appendAvatarParams(params, avatarPreset);

  const data = await serverApiJson<ContactsApiResponse>(
    `${API_ROUTES.CONTACTS}?${params.toString()}`,
    undefined,
    { next: { tags: ["contacts"] } },
  );

  return normalizeContactsList(data);
}
