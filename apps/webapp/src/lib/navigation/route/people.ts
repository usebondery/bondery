import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import type { Route } from "next";
import { routeWithQuery } from "./query";

export function routePeopleSearch(query: string): Route {
  const params = new URLSearchParams({ q: query });
  return routeWithQuery(WEBAPP_ROUTES.PEOPLE, params);
}

export function routePeopleSpotlightSearch(query: string): Route {
  return routeWithQuery(WEBAPP_ROUTES.PEOPLE, { search: query.trim() });
}

export function routePeopleSorted(sort: "createdAtDesc" | "interactionDesc"): Route {
  return routeWithQuery(WEBAPP_ROUTES.PEOPLE, { sort });
}
