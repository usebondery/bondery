import { NEXT_ACTIONS, routePersonWithNextAction, WEBAPP_ROUTES } from "@bondery/helpers";
import { config } from "../../config";

const TRAILING_SLASH_RE = /\/$/u;
/** Absolute webapp URL for an in-app path (must start with `/`). */
export function hrefWebapp(path: string): string {
  const base = config.appUrl.replace(TRAILING_SLASH_RE, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export function hrefWebappHome(): string {
  return hrefWebapp(WEBAPP_ROUTES.HOME);
}

export function hrefWebappPerson(personId: string): string {
  return hrefWebapp(`${WEBAPP_ROUTES.PERSON}/${personId}`);
}

/** Person page with `next_action=add_interaction` for the webapp to open the sheet. */
export function hrefWebappPersonAddInteraction(personId: string): string {
  return hrefWebapp(routePersonWithNextAction(personId, NEXT_ACTIONS.ADD_INTERACTION));
}
