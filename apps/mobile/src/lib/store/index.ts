import { useContactsStore } from "./contacts";
import { useGroupsStore } from "./groups";
import { useTagsStore } from "./tags";

export { useContactsStore } from "./contacts";
export { useGroupsStore } from "./groups";
export { useTagsStore } from "./tags";

export function clearAllEntityStores() {
  useContactsStore.getState().clearAll();
  useGroupsStore.getState().clearAll();
  useTagsStore.getState().clearAll();
}
