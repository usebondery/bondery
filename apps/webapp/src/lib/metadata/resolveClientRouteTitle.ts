import { formatContactName } from "@bondery/helpers/contact";
import { WEBAPP_NAME } from "@bondery/helpers/globals/paths";
import type { Contact, GroupWithCount } from "@bondery/schemas";
import type { QueryClient } from "@tanstack/react-query";
import { formatEntityTitleString, formatStaticTitleString } from "@/lib/metadata/pageTitles";
import { getStaticRouteTitleEntry, matchDynamicRoute } from "@/lib/metadata/routeTitleRegistry";
import { contactKeys, groupKeys, settingsKeys } from "@/lib/query/keys";

export type RouteTitleTranslate = (namespace: string, key: string) => string;

export type ResolveClientRouteTitleOptions = {
  translate: RouteTitleTranslate;
  queryClient: QueryClient;
  optimisticTitle?: string;
  entityTitleOverride?: string | null;
};

const ME_PERSON_AVATAR_PRESETS = ["large", "small"] as const;

function resolveEntityTitleFromCache(
  queryClient: QueryClient,
  match: NonNullable<ReturnType<typeof matchDynamicRoute>>,
  translate: RouteTitleTranslate,
): string | null {
  if (match.kind === "person" && match.id) {
    const contact = queryClient.getQueryData<Contact>(contactKeys.detail(match.id));
    if (contact) {
      return formatEntityTitleString(formatContactName(contact));
    }
    return formatEntityTitleString(translate("SingleContactPage", "PersonFallbackTitle"));
  }

  if (match.kind === "group" && match.id) {
    const group = queryClient.getQueryData<GroupWithCount>(groupKeys.detail(match.id));
    if (group?.label) {
      return formatEntityTitleString(group.label);
    }
    return formatEntityTitleString(translate("GroupsPage", "FallbackTitle"));
  }

  if (match.kind === "myself") {
    for (const preset of ME_PERSON_AVATAR_PRESETS) {
      const me = queryClient.getQueryData<Contact>(settingsKeys.mePerson(preset));
      if (me) {
        return formatEntityTitleString(formatContactName(me));
      }
    }
    return formatEntityTitleString(translate("SingleContactPage", "MyselfPageTitle"));
  }

  return null;
}

/**
 * Resolves the browser tab title for client-side navigation.
 * Returns null only when no title could be determined (caller should use WEBAPP_NAME).
 */
export function resolveClientRouteTitle(
  pathname: string,
  options: ResolveClientRouteTitleOptions,
): string {
  const { translate, queryClient, optimisticTitle, entityTitleOverride } = options;

  if (entityTitleOverride?.trim()) {
    return formatEntityTitleString(entityTitleOverride.trim());
  }

  if (optimisticTitle?.trim()) {
    return optimisticTitle.trim();
  }

  const staticEntry = getStaticRouteTitleEntry(pathname);
  if (staticEntry) {
    return formatStaticTitleString(translate(staticEntry.titleNamespace, staticEntry.titleKey));
  }

  const dynamicMatch = matchDynamicRoute(pathname);
  if (dynamicMatch) {
    return resolveEntityTitleFromCache(queryClient, dynamicMatch, translate) ?? WEBAPP_NAME;
  }

  return WEBAPP_NAME;
}
