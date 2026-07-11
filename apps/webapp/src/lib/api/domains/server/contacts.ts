import "server-only";

import type {
  Activity,
  AddressPin,
  Contact,
  ContactRelationshipWithPeople,
  GroupWithCount,
  ImportantDate,
  LinkedInDataResponse,
  MapPin,
  Tag,
} from "@bondery/schemas";
import {
  buildContactDetailPath,
  buildContactGroupsPath,
  buildContactImportantDatesPath,
  buildContactInteractionsPath,
  buildContactLinkedInDataPath,
  buildContactRelationshipsPath,
  buildContactsListPath,
  buildContactsSelectPath,
  buildContactTagsPath,
  buildMapPinsPath,
  type ContactInteractionsParams,
  type ContactsApiResponse,
  type ContactsDataResult,
  type ContactsListParams,
  type ContactsSelectableApiResponse,
  type ContactsSelectableDataResult,
  type MapAddressPinsResult,
  type MapContactPinsResult,
  type MapPinsBounds,
  type MapPinsMode,
  normalizeContactsList,
  normalizeContactsSelectableList,
  parseContactDetail,
  parseContactGroups,
  parseContactImportantDates,
  parseContactInteractions,
  parseContactRelationships,
  parseContactTags,
  parseMapAddressPins,
  parseMapContactPins,
} from "@/lib/api/resources/contacts";
import { type ServerApiFetchOptions, serverApiJson } from "@/lib/api/server";
import type { AvatarPreset } from "@/lib/contacts/avatarParams";

type ContactReadOptions = Pick<ServerApiFetchOptions, "cache" | "next" | "transportPolicy">;

const CONTACTS_TAG = { next: { tags: ["contacts"] } } satisfies ServerApiFetchOptions;

export async function getContactsListServer(
  params: ContactsListParams,
  options: ContactReadOptions = {},
): Promise<ContactsDataResult> {
  const raw = await serverApiJson<ContactsApiResponse>(buildContactsListPath(params), undefined, {
    ...CONTACTS_TAG,
    ...options,
  });
  return normalizeContactsList(raw, params.limit ?? 50);
}

export async function getContactsSelectableListServer(
  params: ContactsListParams,
  options: ContactReadOptions = {},
): Promise<ContactsSelectableDataResult> {
  const raw = await serverApiJson<ContactsSelectableApiResponse>(
    buildContactsSelectPath(params),
    undefined,
    {
      ...CONTACTS_TAG,
      ...options,
    },
  );
  return normalizeContactsSelectableList(raw, params.limit ?? 50);
}

export async function getContactDetailServer(
  id: string,
  avatarPreset: AvatarPreset = "large",
  options: ContactReadOptions = {},
): Promise<Contact> {
  const raw = await serverApiJson<{ contact?: Contact }>(
    buildContactDetailPath(id, avatarPreset),
    undefined,
    { ...CONTACTS_TAG, ...options },
  );
  return parseContactDetail(raw);
}

export async function getContactRelationshipsServer(
  id: string,
  avatarPreset: AvatarPreset = "small",
  options: ContactReadOptions = {},
): Promise<ContactRelationshipWithPeople[]> {
  const raw = await serverApiJson<{ relationships?: ContactRelationshipWithPeople[] }>(
    buildContactRelationshipsPath(id, avatarPreset),
    undefined,
    { next: { tags: ["relationships", "contacts"] }, ...options },
  );
  return parseContactRelationships(raw);
}

export async function getContactImportantDatesServer(
  id: string,
  options: ContactReadOptions = {},
): Promise<ImportantDate[]> {
  const raw = await serverApiJson<{ dates?: ImportantDate[] }>(
    buildContactImportantDatesPath(id),
    undefined,
    { next: { tags: ["important-dates", "contacts"] }, ...options },
  );
  return parseContactImportantDates(raw);
}

export async function getContactLinkedInDataServer(
  id: string,
  options: ContactReadOptions = {},
): Promise<LinkedInDataResponse> {
  return serverApiJson<LinkedInDataResponse>(buildContactLinkedInDataPath(id), undefined, {
    ...CONTACTS_TAG,
    ...options,
  });
}

export async function getContactTagsServer(
  id: string,
  options: ContactReadOptions = {},
): Promise<Tag[]> {
  const raw = await serverApiJson<{ tags?: Tag[] }>(buildContactTagsPath(id), undefined, {
    next: { tags: ["tags", "contacts"] },
    ...options,
  });
  return parseContactTags(raw);
}

export async function getContactInteractionsServer(
  contactId: string,
  params: ContactInteractionsParams = {},
  options: ContactReadOptions = {},
): Promise<Activity[]> {
  const raw = await serverApiJson<Record<string, unknown>>(
    buildContactInteractionsPath(contactId, params),
    undefined,
    { next: { tags: ["interactions", "contacts"] }, ...options },
  );
  return parseContactInteractions(raw, params.limit ?? 50);
}

export async function getMapPinsServer(
  mode: "contact",
  bounds: MapPinsBounds,
  options?: ContactReadOptions,
): Promise<MapContactPinsResult>;
export async function getMapPinsServer(
  mode: "address",
  bounds: MapPinsBounds,
  options?: ContactReadOptions,
): Promise<MapAddressPinsResult>;
export async function getMapPinsServer(
  mode: MapPinsMode,
  bounds: MapPinsBounds,
  options: ContactReadOptions = {},
): Promise<MapContactPinsResult | MapAddressPinsResult> {
  const raw = await serverApiJson<{ pins?: MapPin[] | AddressPin[] }>(
    buildMapPinsPath(mode, bounds),
    undefined,
    { ...CONTACTS_TAG, ...options },
  );
  return mode === "contact"
    ? parseMapContactPins(raw as { pins?: MapPin[] })
    : parseMapAddressPins(raw as { pins?: AddressPin[] });
}

export async function getContactGroupsServer(
  contactId: string,
  options: ContactReadOptions = {},
): Promise<GroupWithCount[]> {
  const raw = await serverApiJson<{ groups?: GroupWithCount[] }>(
    buildContactGroupsPath(contactId),
    undefined,
    { next: { tags: ["groups", "contacts"] }, ...options },
  );
  return parseContactGroups(raw);
}
