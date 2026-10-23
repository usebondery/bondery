import type { Route } from "next";

/** Narrows a validated marketing-site path to Next.js `Route`. */
export function routeAssert(path: string): Route {
  return path as Route;
}
