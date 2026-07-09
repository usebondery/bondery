import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type {
  Activity,
  AddressPin,
  Contact,
  ContactRelationshipWithPeople,
  ContactsFilter,
  CreateContactInput,
  GroupWithCount,
  ImportantDate,
  LinkedInDataResponse,
  MapPin,
  MergeContactsResponse,
  RefreshMergeRecommendationsResponse,
  RelationshipType,
  Tag,
  UpdateContactInput,
} from "@bondery/schemas";
import { applyTransportResponsePolicy, clientApiFetch, clientApiJson } from "@/lib/api/client";
import {
  buildContactDetailPath,
  buildContactGroupsPath,
  buildContactImportantDatesPath,
  buildContactInteractionsPath,
  buildContactLinkedInDataPath,
  buildContactRelationshipsPath,
  buildContactsListPath,
  buildContactTagsPath,
  buildMapPinsPath,
  type ContactInteractionsParams,
  type ContactsApiResponse,
  type ContactsDataResult,
  type ContactsListParams,
  type MapAddressPinsResult,
  type MapContactPinsResult,
  type MapPinsBounds,
  type MapPinsMode,
  normalizeContactsList,
  parseContactDetail,
  parseContactGroups,
  parseContactImportantDates,
  parseContactInteractions,
  parseContactRelationships,
  parseContactTags,
  parseMapAddressPins,
  parseMapContactPins,
} from "@/lib/api/resources/contacts";
import type { AvatarPreset } from "@/lib/contacts/avatarParams";

export type {
  ContactsDataResult,
  ContactsListParams,
  MapAddressPinsResult,
  MapContactPinsResult,
  MapPinsBounds,
  MapPinsMode,
  SortOrder,
} from "@/lib/api/resources/contacts";

export async function getContactsList(params: ContactsListParams): Promise<ContactsDataResult> {
  const raw = await clientApiJson<ContactsApiResponse>(buildContactsListPath(params));
  return normalizeContactsList(raw, params.limit ?? 50);
}

export async function getContactDetail(
  id: string,
  avatarPreset: AvatarPreset = "large",
): Promise<Contact> {
  const raw = await clientApiJson<{ contact?: Contact }>(buildContactDetailPath(id, avatarPreset));
  return parseContactDetail(raw);
}

export async function getContactRelationships(
  id: string,
  avatarPreset: AvatarPreset = "small",
): Promise<ContactRelationshipWithPeople[]> {
  const raw = await clientApiJson<{ relationships?: ContactRelationshipWithPeople[] }>(
    buildContactRelationshipsPath(id, avatarPreset),
  );
  return parseContactRelationships(raw);
}

export async function getContactImportantDates(id: string): Promise<ImportantDate[]> {
  const raw = await clientApiJson<{ dates?: ImportantDate[] }>(buildContactImportantDatesPath(id));
  return parseContactImportantDates(raw);
}

export async function getContactLinkedInData(id: string): Promise<LinkedInDataResponse> {
  return clientApiJson<LinkedInDataResponse>(buildContactLinkedInDataPath(id));
}

export async function getContactTags(id: string): Promise<Tag[]> {
  const raw = await clientApiJson<{ tags?: Tag[] }>(buildContactTagsPath(id));
  return parseContactTags(raw);
}

export async function getContactInteractions(
  contactId: string,
  params: ContactInteractionsParams = {},
): Promise<Activity[]> {
  const raw = await clientApiJson<Record<string, unknown>>(
    buildContactInteractionsPath(contactId, params),
  );
  return parseContactInteractions(raw, params.limit ?? 50);
}

export async function getMapPins(
  mode: "contact",
  bounds: MapPinsBounds,
): Promise<MapContactPinsResult>;
export async function getMapPins(
  mode: "address",
  bounds: MapPinsBounds,
): Promise<MapAddressPinsResult>;
export async function getMapPins(
  mode: MapPinsMode,
  bounds: MapPinsBounds,
): Promise<MapContactPinsResult | MapAddressPinsResult> {
  const raw = await clientApiJson<{ pins?: MapPin[] | AddressPin[] }>(
    buildMapPinsPath(mode, bounds),
  );
  return mode === "contact"
    ? parseMapContactPins(raw as { pins?: MapPin[] })
    : parseMapAddressPins(raw as { pins?: AddressPin[] });
}

export async function getContactGroups(contactId: string): Promise<GroupWithCount[]> {
  const raw = await clientApiJson<{ groups?: GroupWithCount[] }>(buildContactGroupsPath(contactId));
  return parseContactGroups(raw);
}

export async function listContacts(path: string): Promise<{
  contacts?: Contact[];
  totalCount?: number;
  stats?: Record<string, number>;
}> {
  return clientApiJson(path);
}

/** @deprecated Prefer getContactDetail */
export async function getContact(id: string, queryString = ""): Promise<Contact> {
  const path = queryString
    ? `${API_ROUTES.CONTACTS}/${id}?${queryString}`
    : `${API_ROUTES.CONTACTS}/${id}`;
  const data = await clientApiJson<{ contact?: Contact }>(path);
  if (!data.contact) {
    throw new Error("Contact not found");
  }
  return data.contact;
}

export async function createContact(input: CreateContactInput): Promise<Contact> {
  const data = await clientApiJson<{ contact?: Contact }>(API_ROUTES.CONTACTS, {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  if (!data.contact?.id) {
    throw new Error("Contact was created but response did not include contact");
  }
  return data.contact;
}

export async function updateContact(id: string, patch: UpdateContactInput): Promise<void> {
  await clientApiJson(`${API_ROUTES.CONTACTS}/${id}`, {
    body: JSON.stringify(patch),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

export async function deleteContact(id: string): Promise<void> {
  await clientApiJson(API_ROUTES.CONTACTS, {
    body: JSON.stringify({ ids: [id] }),
    headers: { "Content-Type": "application/json" },
    method: "DELETE",
  });
}

export async function deleteContacts(ids: string[]): Promise<{ deletedCount?: number }> {
  return clientApiJson(API_ROUTES.CONTACTS, {
    body: JSON.stringify({ ids }),
    headers: { "Content-Type": "application/json" },
    method: "DELETE",
  });
}

export async function deleteContactsFiltered(payload: {
  filter: ContactsFilter;
  excludeIds?: string[];
}): Promise<{ deletedCount?: number }> {
  return clientApiJson(API_ROUTES.CONTACTS, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "DELETE",
  });
}

export async function mergeContacts(body: Record<string, unknown>): Promise<MergeContactsResponse> {
  return clientApiJson<MergeContactsResponse>(API_ROUTES.CONTACTS_MERGE, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export async function shareContact(body: Record<string, unknown>): Promise<void> {
  await clientApiJson(API_ROUTES.CONTACTS_SHARE, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export async function refreshMergeRecommendations(): Promise<RefreshMergeRecommendationsResponse> {
  return clientApiJson<RefreshMergeRecommendationsResponse>(
    API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS_REFRESH,
    { method: "POST" },
  );
}

export async function acceptMergeRecommendation(recommendationId: string): Promise<void> {
  await clientApiJson(`${API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS}/${recommendationId}/accept`, {
    method: "PATCH",
  });
}

export async function restoreMergeRecommendation(recommendationId: string): Promise<void> {
  await clientApiJson(`${API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS}/${recommendationId}/restore`, {
    method: "PATCH",
  });
}

export async function declineMergeRecommendation(recommendationId: string): Promise<void> {
  await clientApiJson(`${API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS}/${recommendationId}/decline`, {
    method: "PATCH",
  });
}

export async function downloadContactVcard(id: string): Promise<Response> {
  const response = await clientApiFetch(`${API_ROUTES.CONTACTS}/${id}/vcard`);
  if (!response.ok) {
    applyTransportResponsePolicy(response);
  }
  return response;
}

export async function createContactRelationship(
  contactId: string,
  body: { relationshipType: RelationshipType; relatedPersonId: string },
): Promise<void> {
  await clientApiJson(`${API_ROUTES.CONTACTS}/${contactId}/relationships`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export async function updateContactRelationship(
  contactId: string,
  relationshipId: string,
  body: { relationshipType: RelationshipType; relatedPersonId: string },
): Promise<void> {
  await clientApiJson(`${API_ROUTES.CONTACTS}/${contactId}/relationships/${relationshipId}`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

export async function deleteContactRelationship(
  contactId: string,
  relationshipId: string,
): Promise<void> {
  await clientApiJson(`${API_ROUTES.CONTACTS}/${contactId}/relationships/${relationshipId}`, {
    method: "DELETE",
  });
}

export type ImportantDateInput = Pick<
  ImportantDate,
  "id" | "type" | "date" | "note" | "notifyDaysBefore"
>;

export async function putContactImportantDates(
  contactId: string,
  dates: ImportantDateInput[],
): Promise<void> {
  await clientApiJson(`${API_ROUTES.CONTACTS}/${contactId}/important-dates`, {
    body: JSON.stringify({ dates }),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
}

export async function uploadContactPhoto(contactId: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await clientApiFetch(`${API_ROUTES.CONTACTS}/${contactId}/photo`, {
    body: formData,
    method: "POST",
  });

  if (!response.ok) {
    applyTransportResponsePolicy(response);
    const error = (await response.json()) as { error?: string };
    throw new Error(error.error || "Failed to upload photo");
  }
}

export async function discardEnrichQueue(): Promise<void> {
  await clientApiFetch(`${API_ROUTES.CONTACTS}/enrich-queue`, {
    method: "DELETE",
  });
}
