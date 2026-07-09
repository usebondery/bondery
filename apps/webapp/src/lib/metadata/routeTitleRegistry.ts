import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { type AppNavLinkDef, allAppNavLinks } from "@/lib/navigation/appNavLinks";

export type StaticRouteTitleEntry = {
  path: string;
  titleNamespace: string;
  titleKey: string;
};

export type DynamicRouteKind = "person" | "group" | "myself";

export type DynamicRouteMatch = {
  kind: DynamicRouteKind;
  id?: string;
};

const PERSON_PATH = `${WEBAPP_ROUTES.PERSON}/`;
const GROUP_PATH = "/app/group/";

const staticRouteByPath = new Map<string, StaticRouteTitleEntry>(
  allAppNavLinks.map((link) => [
    link.href,
    {
      path: link.href,
      titleKey: link.titleKey,
      titleNamespace: link.titleNamespace,
    },
  ]),
);

/** Static routes keyed by pathname (from nav + additional registry entries). */
export function getStaticRouteTitleEntry(pathname: string): StaticRouteTitleEntry | null {
  return staticRouteByPath.get(pathname) ?? null;
}

export function matchDynamicRoute(pathname: string): DynamicRouteMatch | null {
  if (pathname === WEBAPP_ROUTES.MYSELF) {
    return { kind: "myself" };
  }

  if (pathname.startsWith(PERSON_PATH)) {
    const id = pathname.slice(PERSON_PATH.length).split("/")[0];
    if (id) {
      return { id, kind: "person" };
    }
  }

  if (pathname.startsWith(GROUP_PATH)) {
    const id = pathname.slice(GROUP_PATH.length).split("/")[0];
    if (id) {
      return { id, kind: "group" };
    }
  }

  return null;
}

/** All static paths registered for document titles (CI + docs). */
export function listStaticRouteTitlePaths(): string[] {
  return [...staticRouteByPath.keys()].sort();
}

/** Nav hrefs that must have registry entries (CI). */
export function listNavLinkDefs(): AppNavLinkDef[] {
  return allAppNavLinks;
}

/** Dynamic route page file segments covered by the registry (CI). */
export const DYNAMIC_ROUTE_PAGE_SEGMENTS = [
  "person/[personId]",
  "group/[groupId]",
  "myself",
] as const;
