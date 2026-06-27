import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { GEOCODE_SUGGEST_MIN_QUERY_LENGTH } from "@bondery/helpers/address";
import { buildGeocodeSuggestQuery } from "@bondery/helpers/geocode";
import type {
  AddContactsToGroupRequest,
  AddContactsToGroupResponse,
  ContactGroupsResponse,
  ContactTagsResponse,
  RemoveGroupMembersRequest,
  RemoveGroupMembersResponse,
  Contact,
  ContactsListResponse,
  CreateContactInput,
  CreateGroupInput,
  CreateTagInput,
  DeleteContactsRequest,
  ContactAddressEntry,
  Group,
  GroupResponse,
  GroupsListResponse,
  ImportantDate,
  Tag,
  TagsListResponse,
  UpdateTagInput,
  ShareableField,
  UpdateContactInput,
  UpdateGroupInput,
  UpdateUserSettingsInput,
  UserSettingsResponse,
  parseGeocodeSuggestResponse,
} from "@bondery/schemas";

const ALL_SHAREABLE_FIELDS: ShareableField[] = [
  "name",
  "avatar",
  "headline",
  "phones",
  "emails",
  "location",
  "linkedin",
  "instagram",
  "facebook",
  "website",
  "whatsapp",
  "signal",
  "addresses",
  "notes",
  "importantDates",
];
import { File, UploadTask, UploadType } from "expo-file-system";
import { API_URL, normalizeMobileUrlForDevice } from "../config";
import { resolveApiErrorMessage, resolveFetchFailureMessage } from "./parseApiErrorBody";
import { supabase } from "../supabase/client";

export type ContactSortOrder =
  | "nameAsc"
  | "nameDesc"
  | "surnameAsc"
  | "surnameDesc"
  | "interactionAsc"
  | "interactionDesc";

function normalizeContactAvatar(contact: Contact): Contact {
  if (!contact.avatar) {
    return contact;
  }

  return {
    ...contact,
    avatar: normalizeMobileUrlForDevice(contact.avatar),
  };
}

async function getBearerHeaders(): Promise<Record<string, string>> {
  if (!supabase) {
    throw new Error(
      "Missing mobile env config. Set EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL, and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error("No authenticated mobile session found.");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export type ContactVCardExport = {
  content: string;
  filename: string;
};

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) {
    return null;
  }

  const match = header.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i);
  if (!match) {
    return null;
  }

  const raw = (match[1] ?? match[2] ?? match[3]).trim();
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function buildContactVCardFilename(
  contact: Pick<Contact, "firstName" | "lastName">,
): string {
  const firstName = contact.firstName || "contact";
  const lastName = contact.lastName || "";
  return lastName ? `${firstName}_${lastName}.vcf` : `${firstName}.vcf`;
}

function sanitizeVCardFilename(filename: string): string {
  const base = filename
    .replace(/[/\\]/g, "")
    .replace(/[^\w.\- ]/g, "_")
    .trim();

  if (!base) {
    return "contact.vcf";
  }

  return base.toLowerCase().endsWith(".vcf") ? base : `${base}.vcf`;
}

async function mobileFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new Error(await resolveFetchFailureMessage(error));
  }
}

let isSigningOutLocally = false;

async function invalidateSessionOnUnauthorized(): Promise<void> {
  if (!supabase || isSigningOutLocally) {
    return;
  }

  isSigningOutLocally = true;
  try {
    await supabase.auth.signOut({ scope: "local" });
  } finally {
    isSigningOutLocally = false;
  }
}

async function throwApiResponseError(params: {
  status: number;
  bodyText: string;
  contentType?: string | null;
}): Promise<never> {
  if (params.status === 401) {
    await invalidateSessionOnUnauthorized();
  }

  throw new Error(
    resolveApiErrorMessage({
      status: params.status,
      bodyText: params.bodyText,
      contentType: params.contentType,
    }),
  );
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured");
  }

  const authHeaders = await getBearerHeaders();
  const hasJsonBody =
    init?.body !== undefined && init?.body !== null && init?.body !== "";

  const headers: Record<string, string> = {
    ...(authHeaders as Record<string, string>),
    ...((init?.headers as Record<string, string>) || {}),
  };

  if (hasJsonBody && headers["Content-Type"] === undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await mobileFetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    await throwApiResponseError({
      status: response.status,
      bodyText: text,
      contentType: response.headers.get("content-type"),
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

/**
 * Fetches contacts for the mobile contact book.
 */
export async function fetchContacts(params: {
  query: string;
  sort: ContactSortOrder;
  limit?: number;
  offset?: number;
}): Promise<ContactsListResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set("sort", params.sort);

  if (params.query.trim()) {
    searchParams.set("q", params.query.trim());
  }

  if (typeof params.limit === "number") {
    searchParams.set("limit", String(params.limit));
  }

  if (typeof params.offset === "number") {
    searchParams.set("offset", String(params.offset));
  }

  const response = await apiRequest<ContactsListResponse>(
    `${API_ROUTES.CONTACTS}?${searchParams.toString()}`,
  );

  return {
    ...response,
    contacts: (response.contacts || []).map(normalizeContactAvatar),
  };
}

/**
 * Deletes contacts by explicit IDs or by filter with optional exclusions.
 */
export async function deleteContacts(
  body: DeleteContactsRequest,
): Promise<{ deletedCount?: number }> {
  const response = await apiRequest<{ success: true; deletedCount?: number }>(API_ROUTES.CONTACTS, {
    method: "DELETE",
    body: JSON.stringify(body),
  });

  return { deletedCount: response.deletedCount };
}

/**
 * Fetches the list of groups with contact counts.
 */
export async function fetchGroups(): Promise<GroupsListResponse> {
  return apiRequest<GroupsListResponse>(API_ROUTES.GROUPS);
}

/**
 * Fetches groups a contact belongs to.
 */
export async function fetchContactGroups(contactId: string): Promise<ContactGroupsResponse> {
  return apiRequest<ContactGroupsResponse>(`${API_ROUTES.CONTACTS}/${contactId}/groups`);
}

/**
 * Adds contacts to a group by explicit IDs or by filter with optional exclusions.
 */
export async function addContactsToGroup(
  groupId: string,
  body: AddContactsToGroupRequest,
): Promise<AddContactsToGroupResponse> {
  return apiRequest<AddContactsToGroupResponse>(
    `${API_ROUTES.GROUPS}/${groupId}/contacts`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}

/**
 * Removes contacts from a group by explicit IDs or by member filter with optional exclusions.
 */
export async function removeGroupMembers(
  groupId: string,
  body: RemoveGroupMembersRequest,
): Promise<RemoveGroupMembersResponse> {
  return apiRequest<RemoveGroupMembersResponse>(
    `${API_ROUTES.GROUPS}/${groupId}/contacts`,
    {
      method: "DELETE",
      body: JSON.stringify(body),
    },
  );
}

/**
 * Fetches the contacts belonging to a specific group.
 */
export async function fetchGroupContacts(
  groupId: string,
  params?: { query?: string; limit?: number; offset?: number },
): Promise<ContactsListResponse> {
  const sp = new URLSearchParams();
  sp.set("sort", "nameAsc");
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.offset) sp.set("offset", String(params.offset));
  if (params?.query?.trim()) sp.set("q", params.query.trim());
  const response = await apiRequest<ContactsListResponse>(
    `${API_ROUTES.GROUPS}/${groupId}/contacts?${sp.toString()}`,
  );

  return {
    ...response,
    contacts: (response.contacts || []).map(normalizeContactAvatar),
  };
}

/**
 * Fetches a single group by ID.
 */
export async function fetchGroup(id: string): Promise<GroupResponse> {
  return apiRequest<GroupResponse>(`${API_ROUTES.GROUPS}/${id}`);
}

/**
 * Creates a new group.
 */
export async function createGroup(input: CreateGroupInput): Promise<{ group: Group }> {
  return apiRequest<{ group: Group }>(API_ROUTES.GROUPS, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Updates an existing group by ID.
 */
export async function updateGroup(
  id: string,
  input: UpdateGroupInput,
): Promise<{ group: Group }> {
  return apiRequest<{ group: Group }>(`${API_ROUTES.GROUPS}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/**
 * Deletes a single group by ID.
 */
export async function deleteGroup(id: string): Promise<void> {
  await apiRequest<unknown>(`${API_ROUTES.GROUPS}/${id}`, {
    method: "DELETE",
  });
}


/**
 * Fetches all tags with contact counts.
 */
export async function fetchTags(): Promise<TagsListResponse> {
  return apiRequest<TagsListResponse>(API_ROUTES.TAGS);
}

/**
 * Fetches a single tag by ID.
 */
export async function fetchTag(id: string): Promise<{ tag: Tag }> {
  return apiRequest<{ tag: Tag }>(`${API_ROUTES.TAGS}/${id}`);
}

/**
 * Creates a new tag (color auto-assigned by API).
 */
export async function createTag(input: CreateTagInput): Promise<{ tag: Tag }> {
  return apiRequest<{ tag: Tag }>(API_ROUTES.TAGS, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Updates an existing tag by ID.
 */
export async function updateTag(id: string, input: UpdateTagInput): Promise<{ tag: Tag }> {
  return apiRequest<{ tag: Tag }>(`${API_ROUTES.TAGS}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/**
 * Deletes a single tag by ID.
 */
export async function deleteTag(id: string): Promise<void> {
  await apiRequest<unknown>(`${API_ROUTES.TAGS}/${id}`, {
    method: "DELETE",
  });
}

/**
 * Fetches tags assigned to a contact.
 */
export async function fetchContactTags(contactId: string): Promise<ContactTagsResponse> {
  return apiRequest<ContactTagsResponse>(`${API_ROUTES.CONTACTS}/${contactId}/tags`);
}

/**
 * Assigns a tag to a contact.
 */
export async function addTagToContact(
  contactId: string,
  tagId: string,
): Promise<{ tag: Tag }> {
  return apiRequest<{ tag: Tag }>(`${API_ROUTES.CONTACTS}/${contactId}/tags`, {
    method: "POST",
    body: JSON.stringify({ tagId }),
  });
}

/**
 * Removes a tag from a contact.
 */
export async function removeTagFromContact(contactId: string, tagId: string): Promise<void> {
  await apiRequest<unknown>(`${API_ROUTES.CONTACTS}/${contactId}/tags/${tagId}`, {
    method: "DELETE",
  });
}

/**
 * Fetches a contact vCard export from the API.
 */
export async function fetchContactVCard(
  contactId: string,
  fallback?: Pick<Contact, "firstName" | "lastName">,
): Promise<ContactVCardExport> {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured");
  }

  const authHeaders = await getBearerHeaders();
  const response = await mobileFetch(`${API_URL}${API_ROUTES.CONTACTS}/${contactId}/vcard`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    const text = await response.text();
    await throwApiResponseError({
      status: response.status,
      bodyText: text,
      contentType: response.headers.get("content-type"),
    });
  }

  const content = await response.text();
  const headerFilename = parseContentDispositionFilename(
    response.headers.get("Content-Disposition"),
  );
  const filename = sanitizeVCardFilename(
    headerFilename ?? (fallback ? buildContactVCardFilename(fallback) : "contact.vcf"),
  );

  return { content, filename };
}

/**
 * Fetches a single contact by ID.
 */
export async function fetchContact(id: string): Promise<{ contact: Contact }> {
  const response = await apiRequest<{ contact: Contact }>(`${API_ROUTES.CONTACTS}/${id}`);

  return {
    contact: normalizeContactAvatar(response.contact),
  };
}

/**
 * Fetches the authenticated user's own contact record.
 */
export async function fetchMyselfContact(): Promise<{ contact: Contact }> {
  const response = await apiRequest<{ contact: Contact }>(API_ROUTES.ME_PERSON);

  return {
    contact: normalizeContactAvatar(response.contact),
  };
}

/**
 * Creates a new contact for the authenticated user.
 */
export async function createContact(
  input: CreateContactInput,
): Promise<{ contact: Contact }> {
  const response = await apiRequest<{ contact: Contact }>(API_ROUTES.CONTACTS, {
    method: "POST",
    body: JSON.stringify(input),
  });

  return {
    contact: normalizeContactAvatar(response.contact),
  };
}

/**
 * Updates an existing contact by ID.
 */
export async function updateContact(
  id: string,
  input: UpdateContactInput,
): Promise<{ contact: Contact }> {
  const response = await apiRequest<{ contact: Contact }>(
    `${API_ROUTES.CONTACTS}/${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  if (!response.contact) {
    throw new Error("Contact update succeeded but response did not include contact");
  }

  return {
    contact: normalizeContactAvatar(response.contact),
  };
}

export type ImportantDateInput = {
  id?: string;
  type: string;
  date: string;
  note?: string | null;
  notifyDaysBefore?: 1 | 3 | 7 | null;
};

/**
 * Uploads a contact profile photo.
 */
export async function uploadContactPhoto(
  id: string,
  uri: string,
  mimeType: string,
): Promise<{ avatarUrl: string }> {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured");
  }

  const authHeaders = await getBearerHeaders();
  const uploadTask = new UploadTask(new File(uri), `${API_URL}${API_ROUTES.CONTACTS}/${id}/photo`, {
    httpMethod: "POST",
    uploadType: UploadType.MULTIPART,
    fieldName: "file",
    mimeType,
    headers: authHeaders,
  });

  let result;
  try {
    result = await uploadTask.uploadAsync();
  } catch (error) {
    throw new Error(await resolveFetchFailureMessage(error));
  }

  if (result.status < 200 || result.status >= 300) {
    await throwApiResponseError({
      status: result.status,
      bodyText: result.body ?? "",
    });
  }

  const data = JSON.parse(result.body) as { avatarUrl: string };
  return {
    avatarUrl: normalizeMobileUrlForDevice(data.avatarUrl),
  };
}

/**
 * Deletes a contact profile photo.
 */
export async function deleteContactPhoto(id: string): Promise<void> {
  await apiRequest<{ success: true }>(`${API_ROUTES.CONTACTS}/${id}/photo`, {
    method: "DELETE",
  });
}

/**
 * Fetches important dates for a contact.
 */
export async function fetchContactImportantDates(
  id: string,
): Promise<{ dates: ImportantDate[] }> {
  return apiRequest<{ dates: ImportantDate[] }>(
    `${API_ROUTES.CONTACTS}/${id}/important-dates`,
  );
}

/**
 * Replaces all important dates for a contact.
 */
export async function replaceImportantDates(
  id: string,
  dates: ImportantDateInput[],
): Promise<{ dates: ImportantDate[] }> {
  return apiRequest<{ dates: ImportantDate[] }>(
    `${API_ROUTES.CONTACTS}/${id}/important-dates`,
    {
      method: "PUT",
      body: JSON.stringify({ dates }),
    },
  );
}

/**
 * Fetches server-backed settings to support settings screen hydration.
 */
export async function fetchSettings(): Promise<UserSettingsResponse> {
  const response = await apiRequest<UserSettingsResponse>(API_ROUTES.ME_SETTINGS);

  return {
    ...response,
    data: {
      ...response.data,
      avatarUrl: response.data.avatarUrl
        ? normalizeMobileUrlForDevice(response.data.avatarUrl)
        : response.data.avatarUrl,
    },
  };
}

/**
 * Updates server-backed user settings.
 */
export async function updateSettings(input: UpdateUserSettingsInput): Promise<{
  success: boolean;
  data: {
    timezone?: string;
    reminderSendHour?: string;
    timeFormat?: "24h" | "12h";
    language?: string;
    colorScheme?: "light" | "dark" | "auto";
    leftSwipeAction?: "call" | "message" | "email";
    rightSwipeAction?: "call" | "message" | "email";
    groupSortOrder?:
      | "recent-opened"
      | "count-desc"
      | "count-asc"
      | "alpha-asc"
      | "alpha-desc";
    tagSortOrder?: "count-desc" | "count-asc" | "alpha-asc" | "alpha-desc";
  };
}> {
  return apiRequest(API_ROUTES.ME_SETTINGS, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/**
 * Deletes the authenticated user's account and all associated server-side data.
 */
export async function deleteMyAccount(): Promise<void> {
  await apiRequest<{ success: true }>(API_ROUTES.ME, {
    method: "DELETE",
  });
}

/**
 * Fetches address/place autocomplete suggestions from the Mapy.com proxy endpoint.
 * The Mapy.com API key is kept server-side; this call goes through the Bondery API.
 *
 * @param query - The search string (min 3 chars).
 * @param mode - "address" (default) includes streets/addresses; "place" returns only cities/regions.
 */
export async function fetchGeocodeSuggestions(
  query: string,
  mode: "address" | "place" = "address",
  signal?: AbortSignal,
): Promise<ContactAddressEntry[]> {
  const trimmed = query.trim();
  if (trimmed.length < GEOCODE_SUGGEST_MIN_QUERY_LENGTH) return [];

  const result = await apiRequest(
    `${API_ROUTES.GEOCODE_SUGGEST}?${buildGeocodeSuggestQuery(trimmed, mode)}`,
    { signal },
  );
  return parseGeocodeSuggestResponse(result);
}

/**
 * Shares a contact via email using the Bondery share endpoint.
 * Sends all available fields; the server renders only those with data.
 */
export async function shareContactEmail(input: {
  personId: string;
  recipientEmails: string[];
  message?: string;
}): Promise<void> {
  await apiRequest<{ success: boolean }>(API_ROUTES.CONTACTS_SHARE, {
    method: "POST",
    body: JSON.stringify({
      personId: input.personId,
      recipientEmails: input.recipientEmails,
      message: input.message,
      selectedFields: ALL_SHAREABLE_FIELDS,
    }),
  });
}
