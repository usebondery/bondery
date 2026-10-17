import type { Group, GroupWithCount } from "@bondery/schemas";
import { useCallback } from "react";
import { useAppNavigation } from "../../../lib/navigation/useAppNavigation";

/**
 * Navigates to a group detail screen through the shared navigation coordinator.
 */
export function useNavigateToGroup() {
  const { openGroup } = useAppNavigation();

  return useCallback(
    (group: Pick<Group, "id" | "label" | "emoji"> | GroupWithCount) => {
      openGroup(group);
    },
    [openGroup],
  );
}
