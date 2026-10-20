import type { Route } from "next";
import { routeAssert } from "./assert";

export function routeWithQuery(
  base: string,
  search: URLSearchParams | Record<string, string>,
): Route {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search);
  const qs = params.toString();
  return qs ? routeAssert(`${base}?${qs}`) : routeAssert(base);
}
