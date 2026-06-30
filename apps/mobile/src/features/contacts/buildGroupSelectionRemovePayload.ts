import type { RemoveGroupMembersRequest } from "@bondery/schemas";
import type { ContactsSelectionState } from "./contactsSelectionStore";

export function buildGroupSelectionRemovePayload(
  state: Pick<
    ContactsSelectionState,
    "isAllTotalSelected" | "getSelectedContactIds" | "getExcludedIds"
  >,
  debouncedQuery: string,
): RemoveGroupMembersRequest {
  if (state.isAllTotalSelected) {
    return {
      memberFilter: { search: debouncedQuery || undefined, sort: "nameAsc" },
      excludePersonIds: state.getExcludedIds(),
    };
  }

  return { personIds: state.getSelectedContactIds() };
}
