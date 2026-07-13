import { formatContactName } from "@bondery/helpers/contact";
import type { Contact, GroupWithCount } from "@bondery/schemas";
import type { QueryClient } from "@tanstack/react-query";
import { formatEntityTitleString } from "@/lib/metadata/pageTitles";
import { matchDynamicRoute } from "@/lib/metadata/routeTitleRegistry";
import { contactKeys, groupKeys, settingsKeys } from "@/lib/query/keys";

export type ResolveClientRouteTitleOptions = {
  queryClient: QueryClient;
  optimisticTitle?: string;
  entityTitleOverride?: string | null;
};

const ME_PERSON_AVATAR_PRESETS = ["large", "small"] as const;

function resolveEntityTitleFromCache(
  queryClient: QueryClient,
  match: NonNullable<ReturnType<typeof matchDynamicRoute>>,
): string | null {
  if (match.kind === "person" && match.id) {
    const contact = queryClient.getQueryData<Contact>(contactKeys.detail(match.id));
    if (contact) {
      return formatEntityTitleString(formatContactName(contact));
    }
    return null;
  }

  if (match.kind === "group" && match.id) {
    const group = queryClient.getQueryData<GroupWithCount>(groupKeys.detail(match.id));
    if (group?.label) {
      return formatEntityTitleString(group.label);
    }
    return null;
  }

  if (match.kind === "myself") {
    for (const preset of ME_PERSON_AVATAR_PRESETS) {
      const me = queryClient.getQueryData<Contact>(settingsKeys.mePerson(preset));
      if (me) {
        return formatEntityTitleString(formatContactName(me));
      }
    }
    return null;
  }

  return null;
}

/**
 * Resolves the browser tab title for entity routes on client-side navigation.
 * Returns null for static routes and cache misses — caller must not overwrite document.title.
 */
export function resolveClientRouteTitle(
  pathname: string,
  options: ResolveClientRouteTitleOptions,
): string | null {
  const { queryClient, optimisticTitle, entityTitleOverride } = options;

  if (entityTitleOverride?.trim()) {
    return formatEntityTitleString(entityTitleOverride.trim());
  }

  if (optimisticTitle?.trim()) {
    return optimisticTitle.trim();
  }

  const dynamicMatch = matchDynamicRoute(pathname);
  if (!dynamicMatch) {
    return null;
  }

  return resolveEntityTitleFromCache(queryClient, dynamicMatch);
}
