import type { ContactsSelectionState } from "./contactsSelectionStore";

/**
 * Resolves explicit person IDs for bulk actions scoped to a group's loaded members.
 * Used when add/delete must target group members rather than the global contact filter.
 */
export function buildGroupSelectionMemberPersonIds(
  state: Pick<
    ContactsSelectionState,
    "isAllTotalSelected" | "getSelectedContactIds" | "getExcludedIds"
  >,
  loadedContacts: { id: string }[],
): string[] {
  if (state.isAllTotalSelected) {
    const excluded = new Set(state.getExcludedIds());
    return loadedContacts.filter((contact) => !excluded.has(contact.id)).map((contact) => contact.id);
  }

  return state.getSelectedContactIds();
}
