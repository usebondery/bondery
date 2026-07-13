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
      excludePersonIds: state.getExcludedIds(),
      memberFilter: { search: debouncedQuery || undefined, sort: "nameAsc" },
    };
  }

  return { personIds: state.getSelectedContactIds() };
}
