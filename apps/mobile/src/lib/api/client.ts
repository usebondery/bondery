import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type {
  Contact,
  ContactsListResponse,
  DeleteContactsRequest,
  GroupsListResponse,
  UserSettingsResponse,
} from "@bondery/types";
import { API_URL } from "../config";
import { supabase } from "../supabase/client";

export type ContactSortOrder =
  | "nameAsc"
  | "nameDesc"
  | "surnameAsc"
  | "surnameDesc"
  | "interactionAsc"
  | "interactionDesc";

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

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured");
  }

  const authHeaders = await getBearerHeaders();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `API request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
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

  return apiRequest<ContactsListResponse>(`${API_ROUTES.CONTACTS}?${searchParams.toString()}`);
}

/**
 * Deletes multiple contacts by their IDs.
 */
export async function deleteContacts(ids: string[]): Promise<void> {
  const body: DeleteContactsRequest = { ids };

  await apiRequest<{ success: true }>(API_ROUTES.CONTACTS, {
    method: "DELETE",
    body: JSON.stringify(body),
  });
}

/**
 * Fetches the list of groups with contact counts.
 */
export async function fetchGroups(): Promise<GroupsListResponse> {
  return apiRequest<GroupsListResponse>(API_ROUTES.GROUPS);
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
  return apiRequest<ContactsListResponse>(
    `${API_ROUTES.GROUPS}/${groupId}/contacts?${sp.toString()}`,
  );
}

/**
 * Fetches a single contact by ID.
 */
export async function fetchContact(id: string): Promise<{ contact: Contact }> {
  return apiRequest<{ contact: Contact }>(`${API_ROUTES.CONTACTS}/${id}`);
}

/**
 * Fetches server-backed settings to support settings screen hydration.
 */
export async function fetchSettings(): Promise<UserSettingsResponse> {
  return apiRequest<UserSettingsResponse>(API_ROUTES.SETTINGS);
}
