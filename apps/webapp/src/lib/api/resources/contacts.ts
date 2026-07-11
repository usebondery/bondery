import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type {
  Activity,
  AddressPin,
  Contact,
  ContactRelationshipWithPeople,
  ContactSelectable,
  GroupWithCount,
  ImportantDate,
  MapPin,
  PaginationMeta,
  Tag,
} from "@bondery/schemas";
import {
  buildInteractionsListPath,
  type InteractionsListParams,
} from "@/lib/api/resources/interactions";
import { normalizePaginatedList } from "@/lib/api/resources/pagination";
import { type AvatarPreset, appendAvatarParams } from "@/lib/contacts/avatarParams";

export type MapPinsMode = "address" | "contact";

export type MapPinsBounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

export type SortOrder =
  | "nameAsc"
  | "nameDesc"
  | "surnameAsc"
  | "surnameDesc"
  | "interactionAsc"
  | "interactionDesc"
  | "createdAtAsc"
  | "createdAtDesc";

export interface ContactsStats {
  newContactsThisYear: number;
  thisMonthInteractions: number;
  totalContacts: number;
}

export interface ContactsDataResult {
  contacts: Contact[];
  pagination: PaginationMeta;
  stats: ContactsStats;
}

export interface ContactsListParams {
  avatarPreset?: AvatarPreset;
  limit?: number;
  offset?: number;
  search?: string;
  sort?: SortOrder;
}

export interface ContactsApiResponse {
  contacts?: Contact[];
  pagination?: PaginationMeta;
  stats?: Partial<ContactsStats>;
}

export interface ContactsSelectableDataResult {
  contacts: ContactSelectable[];
  pagination: PaginationMeta;
}

export interface ContactsSelectableApiResponse {
  contacts?: ContactSelectable[];
  pagination?: PaginationMeta;
}

export function buildContactsListPath({
  search,
  sort,
  limit = 50,
  offset = 0,
  avatarPreset = "small",
}: ContactsListParams): string {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (search) {
    params.set("search", search);
  }
  if (sort) {
    params.set("sort", sort);
  }
  appendAvatarParams(params, avatarPreset);
  return `${API_ROUTES.CONTACTS}?${params.toString()}`;
}

export function buildContactsSelectPath({
  search,
  sort,
  limit = 50,
  offset = 0,
  avatarPreset = "small",
}: ContactsListParams): string {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  if (search) {
    params.set("search", search);
  }
  if (sort) {
    params.set("sort", sort);
  }
  appendAvatarParams(params, avatarPreset);
  return `${API_ROUTES.CONTACTS_SELECT}?${params.toString()}`;
}

export function normalizeContactsList(
  raw: ContactsApiResponse,
  fallbackLimit = 50,
): ContactsDataResult {
  const { items: contacts, pagination } = normalizePaginatedList<Contact, "contacts">(
    raw as Record<string, unknown>,
    "contacts",
    fallbackLimit,
  );
  return {
    contacts,
    pagination,
    stats: {
      newContactsThisYear: raw.stats?.newContactsThisYear ?? 0,
      thisMonthInteractions: raw.stats?.thisMonthInteractions ?? 0,
      totalContacts: raw.stats?.totalContacts ?? pagination.totalCount,
    },
  };
}

export function normalizeContactsSelectableList(
  raw: ContactsSelectableApiResponse,
  fallbackLimit = 50,
): ContactsSelectableDataResult {
  const { items: contacts, pagination } = normalizePaginatedList<ContactSelectable, "contacts">(
    raw as Record<string, unknown>,
    "contacts",
    fallbackLimit,
  );
  return { contacts, pagination };
}

export function buildContactDetailPath(id: string, avatarPreset: AvatarPreset = "large"): string {
  const params = new URLSearchParams();
  appendAvatarParams(params, avatarPreset);
  return `${API_ROUTES.CONTACTS}/${id}?${params.toString()}`;
}

export function parseContactDetail(raw: { contact?: Contact }): Contact {
  if (!raw.contact) {
    throw new Error("Contact not found");
  }
  return raw.contact;
}

export function buildContactRelationshipsPath(
  id: string,
  avatarPreset: AvatarPreset = "small",
): string {
  const params = new URLSearchParams();
  appendAvatarParams(params, avatarPreset);
  return `${API_ROUTES.CONTACTS}/${id}/relationships?${params.toString()}`;
}

export function parseContactRelationships(raw: {
  relationships?: ContactRelationshipWithPeople[];
}): ContactRelationshipWithPeople[] {
  return raw.relationships ?? [];
}

export function buildContactImportantDatesPath(id: string): string {
  return `${API_ROUTES.CONTACTS}/${id}/important-dates`;
}

export function parseContactImportantDates(raw: { dates?: ImportantDate[] }): ImportantDate[] {
  return raw.dates ?? [];
}

export function buildContactLinkedInDataPath(id: string): string {
  return `${API_ROUTES.CONTACTS}/${id}/linkedin-data`;
}

export function buildContactTagsPath(id: string): string {
  return `${API_ROUTES.CONTACTS}/${id}/tags`;
}

export function parseContactTags(raw: { tags?: Tag[] }): Tag[] {
  return raw.tags ?? [];
}

export type ContactInteractionsParams = Omit<InteractionsListParams, "contactId">;

export function buildContactInteractionsPath(
  contactId: string,
  params: ContactInteractionsParams = {},
): string {
  return buildInteractionsListPath({ ...params, contactId });
}

export function parseContactInteractions(
  raw: Record<string, unknown>,
  fallbackLimit = 50,
): Activity[] {
  const { items } = normalizePaginatedList<Activity, "interactions">(
    raw,
    "interactions",
    fallbackLimit,
  );
  return items;
}

export function buildMapPinsPath(mode: MapPinsMode, bounds: MapPinsBounds): string {
  const params = new URLSearchParams({
    maxLat: String(bounds.maxLat),
    maxLon: String(bounds.maxLon),
    minLat: String(bounds.minLat),
    minLon: String(bounds.minLon),
  });
  const endpoint =
    mode === "address" ? API_ROUTES.CONTACTS_MAP_ADDRESS_PINS : API_ROUTES.CONTACTS_MAP_PINS;
  return `${endpoint}?${params.toString()}`;
}

export type MapContactPinsResult = { pins: MapPin[] };
export type MapAddressPinsResult = { pins: AddressPin[] };

export function parseMapContactPins(raw: { pins?: MapPin[] }): MapContactPinsResult {
  return { pins: raw.pins ?? [] };
}

export function parseMapAddressPins(raw: { pins?: AddressPin[] }): MapAddressPinsResult {
  return { pins: raw.pins ?? [] };
}

export function buildContactGroupsPath(contactId: string): string {
  return `${API_ROUTES.CONTACTS}/${contactId}/groups`;
}

export function parseContactGroups(raw: { groups?: GroupWithCount[] }): GroupWithCount[] {
  return raw.groups ?? [];
}
