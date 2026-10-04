import { PEOPLE_PICKER_PAGE_SIZE } from "@bondery/mantine-next";
import type { ContactSelectable } from "@bondery/schemas";
import { useQuery } from "@tanstack/react-query";
import { searchContacts } from "@/lib/contacts/searchContacts";
import { contactKeys } from "@/lib/query/keys";

export function useContactSearchQuery(query: string, enabled = true) {
  const trimmed = query.trim();
  return useQuery({
    enabled: enabled && trimmed.length > 0,
    queryFn: async (): Promise<ContactSelectable[]> => {
      if (trimmed.length === 0) {
        return [];
      }
      return searchContacts(trimmed);
    },
    queryKey: contactKeys.selectable.list({
      limit: PEOPLE_PICKER_PAGE_SIZE,
      offset: 0,
      search: trimmed,
    }),
  });
}
