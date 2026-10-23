import type { Group, GroupWithCount } from "@bondery/schemas";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";
import { contactsHrefWithGroupId } from "./contactsGroupFilterRoute";
import { useIsNavigationLocked } from "./NavigationProvider";
import { runAppNavigation } from "./navigationCoordinator";
import type { AppNavigateOptions, NavigationDropReason } from "./types";

export function useAppNavigation() {
  const router = useRouter();
  const isNavigationLocked = useIsNavigationLocked();

  function navigate(options: AppNavigateOptions): "executed" | NavigationDropReason {
    return runAppNavigation(router, options);
  }

  function push(href: Href): "executed" | NavigationDropReason {
    return runAppNavigation(router, { href, mode: "push" });
  }

  function navigateTo(href: Href): "executed" | NavigationDropReason {
    return runAppNavigation(router, { href, mode: "navigate" });
  }

  function replace(href: Href, respectTransitionLock = false): "executed" | NavigationDropReason {
    return runAppNavigation(router, {
      href,
      mode: "replace",
      respectTransitionLock,
    });
  }

  function openContact(contactId: string) {
    return navigateTo({
      params: { id: contactId },
      pathname: "/contact/[id]",
    });
  }

  function openMyself() {
    return push("/myself");
  }

  function openGroup(group: Pick<Group, "id"> | GroupWithCount | string) {
    const groupId = typeof group === "string" ? group : group.id;
    return navigateTo(contactsHrefWithGroupId(groupId));
  }

  function openContactNotes(contactId: string) {
    return push(`/contact/${contactId}/notes`);
  }

  function openMyselfNotes() {
    return push("/myself/notes");
  }

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
