import type { Group, GroupWithCount } from "@bondery/schemas";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { contactsHrefWithGroupId } from "./contactsGroupFilterRoute";
import { useIsNavigationLocked } from "./NavigationProvider";
import { runAppNavigation } from "./navigationCoordinator";
import type { AppNavigateOptions, NavigationDropReason } from "./types";

export function useAppNavigation() {
  const router = useRouter();
  const isNavigationLocked = useIsNavigationLocked();

  const navigate = useCallback(
    (options: AppNavigateOptions): "executed" | NavigationDropReason => {
      return runAppNavigation(router, options);
    },
    [router],
  );

  const push = useCallback(
    (href: Href): "executed" | NavigationDropReason => {
      return runAppNavigation(router, { href, mode: "push" });
    },
    [router],
  );

  const navigateTo = useCallback(
    (href: Href): "executed" | NavigationDropReason => {
      return runAppNavigation(router, { href, mode: "navigate" });
    },
    [router],
  );

  const replace = useCallback(
    (href: Href, respectTransitionLock = false): "executed" | NavigationDropReason => {
      return runAppNavigation(router, {
        href,
        mode: "replace",
        respectTransitionLock,
      });
    },
    [router],
  );

  const openContact = useCallback(
    (contactId: string) => {
      return navigateTo({
        params: { id: contactId },
        pathname: "/contact/[id]",
      });
    },
    [navigateTo],
  );

  const openMyself = useCallback(() => {
    return push("/myself");
  }, [push]);

  const openGroup = useCallback(
    (group: Pick<Group, "id"> | GroupWithCount | string) => {
      const groupId = typeof group === "string" ? group : group.id;
      return navigateTo(contactsHrefWithGroupId(groupId));
    },
    [navigateTo],
  );

  const openContactNotes = useCallback(
    (contactId: string) => {
      return push(`/contact/${contactId}/notes`);
    },
    [push],
  );

  const openMyselfNotes = useCallback(() => {
    return push("/myself/notes");
  }, [push]);

  return {
    isNavigationLocked,
    navigate,
    navigateTo,
    openContact,
    openContactNotes,
    openGroup,
    openMyself,
    openMyselfNotes,
    push,
    replace,
  };
}
