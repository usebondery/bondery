import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";

export type DynamicRouteKind = "person" | "group" | "myself";

export type DynamicRouteMatch = {
  kind: DynamicRouteKind;
  id?: string;
};

const PERSON_PATH = `${WEBAPP_ROUTES.PERSON}/`;
const GROUP_PATH = "/app/group/";

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
