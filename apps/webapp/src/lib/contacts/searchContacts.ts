import type { Contact } from "@bondery/schemas";
import { getContactsList } from "@/lib/api/domains/contacts";
import { getQueryClient } from "@/lib/query/client";
import { contactKeys } from "@/lib/query/keys";

/**
 * Searches contacts by name for client-side pickers.
 * Uses TanStack Query cache when called from React; falls back to direct fetch.
 */
export async function searchContacts(query: string): Promise<Contact[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const queryClient = getQueryClient();
  const data = await queryClient.fetchQuery({
    queryFn: () => getContactsList({ limit: 10, search: trimmed }),
    queryKey: contactKeys.search(trimmed),
  });
  return data.contacts;
}
