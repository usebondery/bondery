import type { Group, GroupWithCount } from "@bondery/schemas";
import { useAppNavigation } from "../../../lib/navigation/useAppNavigation";

/**
 * Navigates to a group detail screen through the shared navigation coordinator.
 */
export function useNavigateToGroup() {
  const { openGroup } = useAppNavigation();

  return (group: Pick<Group, "id" | "label" | "emoji"> | GroupWithCount) => {
    openGroup(group);
  };
}
