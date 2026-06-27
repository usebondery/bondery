import type { AddContactsToGroupRequest } from "@bondery/schemas";
import type { ContactsSelectionState } from "./contactsSelectionStore";

export function buildContactsSelectionGroupPayload(
  state: Pick<
    ContactsSelectionState,
    "isAllTotalSelected" | "getSelectedContactIds" | "getExcludedIds"
  >,
  debouncedQuery: string,
): AddContactsToGroupRequest {
  if (state.isAllTotalSelected) {
    return {
      contactFilter: { q: debouncedQuery || undefined, sort: "nameAsc" },
      excludePersonIds: state.getExcludedIds(),
    };
  }

  return { personIds: state.getSelectedContactIds() };
}
