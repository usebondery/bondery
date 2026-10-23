import type { Route } from "next";
import type { SafeAppReturnPath } from "@/lib/auth/returnIntent";
import { buildLoginUrl } from "@/lib/auth/returnIntent";
import { routeAssert } from "./assert";

export function routeLogin(returnPath?: SafeAppReturnPath | null): Route {
  return routeAssert(buildLoginUrl(returnPath));
}
