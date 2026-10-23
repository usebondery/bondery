import type { Route } from "next";
import { redirect } from "next/navigation";

/** Server `redirect()` for in-app paths typed as `Route`. */
export function redirectRoute(path: Route): never {
  redirect(path);
}
