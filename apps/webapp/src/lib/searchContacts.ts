import type { Contact } from "@bondery/schemas";
import { getQueryClient } from "@/lib/query/client";
import { contactKeys } from "@/lib/query/keys";
import { createClientFetcher } from "@/lib/query/fetchers/createClientFetcher";
import { buildContactsListPath } from "@/lib/query/fetchers/contacts";

/**
 * Searches contacts by name for client-side pickers.
 * Uses TanStack Query cache when called from React; falls back to direct fetch.
 */
export async function searchContacts(query: string): Promise<Contact[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const queryClient = getQueryClient();
  return queryClient.fetchQuery({
    queryKey: contactKeys.search(trimmed),
    queryFn: async () => {
      const fetch = createClientFetcher();
      const data = await fetch<{ contacts?: Contact[] }>(
        buildContactsListPath({ search: trimmed, limit: 10 }),
      );
      return data.contacts ?? [];
    },
  });
}