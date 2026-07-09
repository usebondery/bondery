import type { Group, GroupWithCount } from "@bondery/schemas";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef } from "react";

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
        params: {
          emoji: group.emoji || "",
          id: group.id,
          label: group.label,
        },
        pathname: "/group/[id]",
      });
    },
    [router],
  );
}
