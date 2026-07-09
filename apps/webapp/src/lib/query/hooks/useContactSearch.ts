import type { Contact } from "@bondery/schemas";
import { useQuery } from "@tanstack/react-query";
import { getContactsList } from "@/lib/api/domains/contacts";
import { contactKeys } from "@/lib/query/keys";

export function useContactSearchQuery(query: string, enabled = true) {
  const trimmed = query.trim();
  return useQuery({
    enabled: enabled && trimmed.length > 0,
    queryFn: async (): Promise<Contact[]> => {
      if (trimmed.length === 0) {
        return [];
      }
      const data = await getContactsList({ limit: 10, search: trimmed });
      return data.contacts;
    },
    queryKey: contactKeys.search(trimmed),
  });
}
