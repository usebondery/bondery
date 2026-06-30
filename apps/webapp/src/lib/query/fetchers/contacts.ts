import { API_ROUTES } from "@bondery/helpers/globals/paths";

import type { Contact, ContactRelationshipWithPeople, GroupWithCount, ImportantDate, PaginationMeta } from "@bondery/schemas";

import { appendAvatarParams, type AvatarPreset } from "@/lib/avatarParams";

import { createClientFetcher } from "./createClientFetcher";

import { normalizePaginatedList } from "./pagination";



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

  totalContacts: number;

  thisMonthInteractions: number;

  newContactsThisYear: number;

}



export interface ContactsDataResult {

  contacts: Contact[];

  pagination: PaginationMeta;

  stats: ContactsStats;

}



export interface ContactsListParams {

  search?: string;

  sort?: SortOrder;

  limit?: number;

  offset?: number;

  avatarPreset?: AvatarPreset;

}



export interface ContactsApiResponse {

  contacts?: Contact[];

  pagination?: PaginationMeta;

  stats?: Partial<ContactsStats>;

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

  if (search) params.set("search", search);

  if (sort) params.set("sort", sort);

  appendAvatarParams(params, avatarPreset);

  return `${API_ROUTES.CONTACTS}?${params.toString()}`;

}



export function normalizeContactsList(raw: ContactsApiResponse, fallbackLimit = 50): ContactsDataResult {

  const { items: contacts, pagination } = normalizePaginatedList<Contact, "contacts">(

    raw as Record<string, unknown>,

    "contacts",

    fallbackLimit,

  );

  return {

    contacts,

    pagination,

    stats: {

      totalContacts: raw.stats?.totalContacts ?? pagination.totalCount,

      thisMonthInteractions: raw.stats?.thisMonthInteractions ?? 0,

      newContactsThisYear: raw.stats?.newContactsThisYear ?? 0,

    },

  };

}



export function createContactsListQueryFn(params: ContactsListParams) {

  const fetch = createClientFetcher();

  const path = buildContactsListPath(params);

  return async (): Promise<ContactsDataResult> => {

    const raw = await fetch<ContactsApiResponse>(path);

    return normalizeContactsList(raw, params.limit ?? 50);

  };

}



export function createContactDetailQueryFn(id: string, avatarPreset: AvatarPreset = "large") {

  const fetch = createClientFetcher();

  const params = new URLSearchParams();

  appendAvatarParams(params, avatarPreset);

  const path = `${API_ROUTES.CONTACTS}/${id}?${params.toString()}`;

  return async (): Promise<Contact> => {

    const raw = await fetch<{ contact?: Contact }>(path);

    if (!raw.contact) throw new Error("Contact not found");

    return raw.contact;

  };

}



export function createContactRelationshipsQueryFn(id: string, avatarPreset: AvatarPreset = "small") {

  const fetch = createClientFetcher();

  const params = new URLSearchParams();

  appendAvatarParams(params, avatarPreset);

  const path = `${API_ROUTES.CONTACTS}/${id}/relationships?${params.toString()}`;

  return async (): Promise<ContactRelationshipWithPeople[]> => {

    const raw = await fetch<{ relationships?: ContactRelationshipWithPeople[] }>(path);

    return raw.relationships ?? [];

  };

}



export function createContactImportantDatesQueryFn(id: string) {

  const fetch = createClientFetcher();

  const path = `${API_ROUTES.CONTACTS}/${id}/important-dates`;

  return async (): Promise<ImportantDate[]> => {

    const raw = await fetch<{ dates?: ImportantDate[] }>(path);

    return raw.dates ?? [];

  };

}



export function buildMapPinsPath(mode: MapPinsMode, bounds: MapPinsBounds): string {

  const params = new URLSearchParams({

    minLat: String(bounds.minLat),

    maxLat: String(bounds.maxLat),

    minLon: String(bounds.minLon),

    maxLon: String(bounds.maxLon),

  });

  const endpoint =

    mode === "address"

      ? API_ROUTES.CONTACTS_MAP_ADDRESS_PINS

      : API_ROUTES.CONTACTS_MAP_PINS;

  return `${endpoint}?${params.toString()}`;

}



export function createMapPinsQueryFn(mode: MapPinsMode, bounds: MapPinsBounds) {

  const fetch = createClientFetcher();

  const path = buildMapPinsPath(mode, bounds);

  return async (): Promise<{ pins: unknown[] }> => {

    const raw = await fetch<{ pins?: unknown[] }>(path);

    return { pins: raw.pins ?? [] };

  };

}



export function createContactGroupsQueryFn(contactId: string) {

  const fetch = createClientFetcher();

  const path = `${API_ROUTES.CONTACTS}/${contactId}/groups`;

  return async (): Promise<GroupWithCount[]> => {

    const raw = await fetch<{ groups?: GroupWithCount[] }>(path);

    return raw.groups ?? [];

  };

}


