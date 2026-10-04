import { PEOPLE_PICKER_PAGE_SIZE } from "@bondery/mantine-next";
import type { ContactSelectable } from "@bondery/schemas";
import { getContactsSelectableList } from "@/lib/api/domains/contacts";
import { getQueryClient } from "@/lib/query/client";
import { contactKeys } from "@/lib/query/keys";

export async function searchContactsPage(
  query: string,
  paging: { limit: number; offset: number },
): Promise<{ contacts: ContactSelectable[]; hasMore: boolean }> {
  const trimmed = query.trim();
  const params = {
    limit: paging.limit,
    offset: paging.offset,
    ...(trimmed.length > 0 ? { search: trimmed } : {}),
  };
  const queryClient = getQueryClient();
  const data = await queryClient.fetchQuery({
    queryFn: () => getContactsSelectableList(params),
    queryKey: contactKeys.selectable.list(params),
  });
  return { contacts: data.contacts, hasMore: data.pagination.hasMore };
}

/**
 * Searches contacts by name for client-side pickers.
 * Uses TanStack Query cache when called from React; falls back to direct fetch.
 * Page 0 only — Find person spotlight stays on a single page.
 */
export async function searchContacts(query: string): Promise<ContactSelectable[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const page = await searchContactsPage(trimmed, { limit: PEOPLE_PICKER_PAGE_SIZE, offset: 0 });
  return page.contacts;
}
