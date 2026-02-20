import { API_URL } from "@/lib/config";
import { getAuthHeaders } from "@/lib/authHeaders";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { Contact } from "@bondery/types";

export type SortOrder =
  | "nameAsc"
  | "nameDesc"
  | "surnameAsc"
  | "surnameDesc"
  | "interactionAsc"
  | "interactionDesc";

export interface ContactsStats {
  totalContacts: number;
  thisMonthInteractions: number;
  newContactsThisYear: number;
}

export interface ContactsDataResult {
  contacts: Contact[];
  totalCount: number;
  stats: ContactsStats;
}

/**
 * Fetches paginated contacts with aggregate stats from the contacts API endpoint.
 *
 * @param query - Optional search query.
 * @param sort - Optional contacts sorting mode.
 * @param limit - Page size for contacts fetch.
 * @param offset - Starting offset for contacts fetch.
 * @returns Contacts list, total count, and stats for dashboard usage.
 */
export async function getContactsData(
  query?: string,
  sort?: SortOrder,
  limit = 50,
  offset = 0,
): Promise<ContactsDataResult> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  if (query) {
    params.set("q", query);
  }

  if (sort) {
    params.set("sort", sort);
  }

  const response = await fetch(`${API_URL}${API_ROUTES.CONTACTS}?${params.toString()}`, {
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch contacts: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return {
    contacts: (data.contacts || []) as Contact[],
    totalCount: Number.isFinite(data.totalCount) ? data.totalCount : (data.contacts || []).length,
    stats: {
      totalContacts: data?.stats?.totalContacts ?? data.totalCount ?? 0,
      thisMonthInteractions: data?.stats?.thisMonthInteractions ?? 0,
      newContactsThisYear: data?.stats?.newContactsThisYear ?? 0,
    },
  };
}
