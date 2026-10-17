import { readContactIds } from "../../lib/sync/hooks/useSyncQuery";
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
  const ids = readContactIds({
    excludeMyself: true,
    groupId: options?.groupId,
    query: debouncedQuery,
  });

  return ids.filter((id) => !excluded.has(id));
}
