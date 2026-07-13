import type { ContactSelectable } from "@bondery/schemas";
import { useQuery } from "@tanstack/react-query";
import { getContactsSelectableList } from "@/lib/api/domains/contacts";
import { contactKeys } from "@/lib/query/keys";

export function useContactSearchQuery(query: string, enabled = true) {
  const trimmed = query.trim();
  return useQuery({
    enabled: enabled && trimmed.length > 0,
    queryFn: async (): Promise<ContactSelectable[]> => {
      if (trimmed.length === 0) {
        return [];
      }
      const data = await getContactsSelectableList({ limit: 10, search: trimmed });
      return data.contacts;
    },
    queryKey: contactKeys.selectable.search(trimmed),
  });
}
