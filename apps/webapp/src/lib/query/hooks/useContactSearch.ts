import { useQuery } from "@tanstack/react-query";
import type { Contact } from "@bondery/schemas";
import { contactKeys } from "@/lib/query/keys";
import { createClientFetcher } from "@/lib/query/fetchers/createClientFetcher";
import { buildContactsListPath } from "@/lib/query/fetchers/contacts";

export function useContactSearchQuery(query: string, enabled = true) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: contactKeys.search(trimmed),
    queryFn: async (): Promise<Contact[]> => {
      if (trimmed.length === 0) return [];
      const fetch = createClientFetcher();
      const data = await fetch<{ contacts?: Contact[] }>(buildContactsListPath({ search: trimmed, limit: 10 }));
      return data.contacts ?? [];
    },
    enabled: enabled && trimmed.length > 0,
  });
}
