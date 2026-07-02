import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type {
  Contact,
  ContactsFilter,
  CreateContactInput,
  Group,
  GroupWithCount,
  ImportantDate,
  MergeContactsResponse,
  RefreshMergeRecommendationsResponse,
  RelationshipType,
  UpdateContactInput,
} from "@bondery/schemas";
import { applyTransportResponsePolicy, clientApiFetch, clientApiJson } from "@/lib/api/client";

export async function listContacts(path: string): Promise<{
  contacts?: Contact[];
  totalCount?: number;
  stats?: Record<string, number>;
}> {
  return clientApiJson(path);
}

export async function getContact(id: string, queryString = ""): Promise<Contact> {
  const path = queryString
    ? `${API_ROUTES.CONTACTS}/${id}?${queryString}`
    : `${API_ROUTES.CONTACTS}/${id}`;
  const data = await clientApiJson<{ contact?: Contact }>(path);
  if (!data.contact) throw new Error("Contact not found");
  return data.contact;
}

export async function createContact(input: CreateContactInput): Promise<Contact> {
  const data = await clientApiJson<{ contact?: Contact }>(API_ROUTES.CONTACTS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!data.contact?.id) throw new Error("Contact was created but response did not include contact");
  return data.contact;
}

export async function updateContact(id: string, patch: UpdateContactInput): Promise<void> {
  await clientApiJson(`${API_ROUTES.CONTACTS}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function deleteContact(id: string): Promise<void> {
  await clientApiJson(API_ROUTES.CONTACTS, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: [id] }),
  });
}

export async function deleteContacts(ids: string[]): Promise<{ deletedCount?: number }> {
  return clientApiJson(API_ROUTES.CONTACTS, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
}

export async function deleteContactsFiltered(payload: {
  filter: ContactsFilter;
  excludeIds?: string[];
}): Promise<{ deletedCount?: number }> {
  return clientApiJson(API_ROUTES.CONTACTS, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function mergeContacts(body: Record<string, unknown>): Promise<MergeContactsResponse> {
  return clientApiJson<MergeContactsResponse>(API_ROUTES.CONTACTS_MERGE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function shareContact(body: Record<string, unknown>): Promise<void> {
  await clientApiJson(API_ROUTES.CONTACTS_SHARE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export type MapPinsMode = "address" | "contact";

export type MapPinsBounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

function buildMapPinsPath(mode: MapPinsMode, bounds: MapPinsBounds): string {
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

export async function listMapPins(mode: MapPinsMode, bounds: MapPinsBounds) {
  return clientApiJson<{ pins?: unknown[] }>(buildMapPinsPath(mode, bounds));
}

export async function listContactGroups(contactId: string): Promise<GroupWithCount[]> {
  const data = await clientApiJson<{ groups?: GroupWithCount[] }>(
    `${API_ROUTES.CONTACTS}/${contactId}/groups`,
  );
  return data.groups ?? [];
}

export async function refreshMergeRecommendations(): Promise<RefreshMergeRecommendationsResponse> {
  return clientApiJson<RefreshMergeRecommendationsResponse>(
    API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS_REFRESH,
    { method: "POST" },
  );
}

export async function acceptMergeRecommendation(recommendationId: string): Promise<void> {
  await clientApiJson(
    `${API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS}/${recommendationId}/accept`,
    { method: "PATCH" },
  );
}

export async function restoreMergeRecommendation(recommendationId: string): Promise<void> {
  await clientApiJson(
    `${API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS}/${recommendationId}/restore`,
    { method: "PATCH" },
  );
}

export async function declineMergeRecommendation(recommendationId: string): Promise<void> {
  await clientApiJson(
    `${API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS}/${recommendationId}/decline`,
    { method: "PATCH" },
  );
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
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateContactRelationship(
  contactId: string,
  relationshipId: string,
  body: { relationshipType: RelationshipType; relatedPersonId: string },
): Promise<void> {
  await clientApiJson(`${API_ROUTES.CONTACTS}/${contactId}/relationships/${relationshipId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dates }),
  });
}
