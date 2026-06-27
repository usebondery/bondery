import { useCallback, useRef } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import type { Group, GroupWithCount } from "@bondery/schemas";

/**
 * Navigates to a group detail screen without stacking duplicate routes on rapid taps.
 */
export function useNavigateToGroup() {
  const router = useRouter();
  const navigatingToGroupIdRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      navigatingToGroupIdRef.current = null;
    }, []),
  );

  return useCallback(
    (group: Pick<Group, "id" | "label" | "emoji"> | GroupWithCount) => {
      if (navigatingToGroupIdRef.current === group.id) {
        return;
      }

      navigatingToGroupIdRef.current = group.id;

      router.navigate({
        pathname: "/group/[id]",
        params: {
          id: group.id,
          label: group.label,
          emoji: group.emoji || "",
        },
      });
    },
    [router],
  );
}
