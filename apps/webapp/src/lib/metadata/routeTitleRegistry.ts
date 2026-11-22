import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";

const PERSON_PATH = `${WEBAPP_ROUTES.PERSON}/`;
const GROUP_PATH = "/app/group/";
const CHAT_PATH = `${WEBAPP_ROUTES.CHAT}/`;

export type DynamicRouteKind = "chat" | "group" | "myself" | "person";

export type DynamicRouteMatch = {
  kind: DynamicRouteKind;
  id?: string;
};

export function matchDynamicRoute(pathname: string): DynamicRouteMatch | null {
  if (pathname === WEBAPP_ROUTES.MYSELF) {
    return { kind: "myself" };
  }

  if (pathname.startsWith(PERSON_PATH)) {
    const [id] = pathname.slice(PERSON_PATH.length).split("/");
    if (id) {
      return { id, kind: "person" };
    }
  }

  if (pathname.startsWith(GROUP_PATH)) {
    const [id] = pathname.slice(GROUP_PATH.length).split("/");
    if (id) {
      return { id, kind: "group" };
    }
  }

  if (pathname.startsWith(CHAT_PATH)) {
    const [id] = pathname.slice(CHAT_PATH.length).split("/");
    if (id) {
      return { id, kind: "chat" };
    }
  }

  return null;
}
