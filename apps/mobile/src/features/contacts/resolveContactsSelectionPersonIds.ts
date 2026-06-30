import { CONTACTS_PAGE_SIZE } from "../../lib/config";
import { contactsDomain } from "../../lib/domains/contacts";
import { groupsDomain } from "../../lib/domains/groups";
import { buildGroupSelectionMemberPersonIds } from "./buildGroupSelectionMemberPersonIds";
import type { ContactsSelectionState } from "./contactsSelectionStore";

export function resolveContactsSelectionPersonIds(
  state: Pick<
    ContactsSelectionState,
    "isAllTotalSelected" | "getSelectedContactIds" | "getExcludedIds"
  >,
  debouncedQuery: string,
  options?: { groupId?: string; loadedGroupMembers?: { id: string }[] },
): string[] {
  if (options?.loadedGroupMembers) {
    return buildGroupSelectionMemberPersonIds(state, options.loadedGroupMembers);
  }

  if (!state.isAllTotalSelected) {
    return state.getSelectedContactIds();
  }

  const excluded = new Set(state.getExcludedIds());
  const ids: string[] = [];
  let offset = 0;

  while (true) {
    const page = options?.groupId
      ? groupsDomain.listMembers({
          groupId: options.groupId,
          query: debouncedQuery,
          limit: CONTACTS_PAGE_SIZE,
          offset,
        })
      : contactsDomain.list({
          query: debouncedQuery,
          limit: CONTACTS_PAGE_SIZE,
          offset,
          excludeMyself: true,
        });

    for (const contact of page.contacts) {
      if (!excluded.has(contact.id)) {
        ids.push(contact.id);
      }
    }

    if (offset + page.contacts.length >= page.totalCount) {
      break;
    }

    offset += CONTACTS_PAGE_SIZE;
  }

  return ids;
}
