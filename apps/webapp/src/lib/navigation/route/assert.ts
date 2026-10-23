import type { Route } from "next";

/**
 * Narrows a validated in-app path to Next.js `Route`.
 * Use only after `isSafeReturnPath`, capture helpers, or known-safe builders.
 */
export function routeAssert(path: string): Route {
  return path as Route;
}
