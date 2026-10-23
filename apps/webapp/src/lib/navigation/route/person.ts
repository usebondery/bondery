import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { Route } from "next";

export function routePerson(personId: string): Route {
  return `${WEBAPP_ROUTES.PERSON}/${personId}` as Route;
}
