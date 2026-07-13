import { CONTACTS_PAGE_SIZE } from "../../lib/config";
import { listGroupMembers, readContactsList } from "../../lib/sync/hooks/useSyncQuery";
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
      ? listGroupMembers({
          groupId: options.groupId,
          limit: CONTACTS_PAGE_SIZE,
          offset,
          query: debouncedQuery,
        })
      : readContactsList({
          excludeMyself: true,
          limit: CONTACTS_PAGE_SIZE,
          offset,
          query: debouncedQuery,
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
