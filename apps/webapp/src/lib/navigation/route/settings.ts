import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { Route } from "next";

export function routeSettings(hash?: string): Route {
  if (!hash) {
    return WEBAPP_ROUTES.SETTINGS as Route;
  }
  return `${WEBAPP_ROUTES.SETTINGS}#${hash}` as Route;
}
