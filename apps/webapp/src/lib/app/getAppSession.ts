import { cache } from "react";
import { probeMeSessionServer } from "@/lib/api/domains/server/meSession";
import type { MeSessionData } from "@/lib/api/resources/meSession";

export type { MeSessionData };

export type AppSessionResult =
  | { status: "ok"; session: MeSessionData }
  | { status: "unauthorized" }
  | { status: "unavailable" };

/**
 * Server routing probe: session fetch + tri-state outcome for app layout guards.
 *
 * Wrapped in React cache() so it executes at most once per server render.
 */
export const getAppSession = cache(async (): Promise<AppSessionResult> => {
  const result = await probeMeSessionServer();
  if (result.status !== "ok") {
    return result;
  }
  return {
    session: result.session,
    status: "ok",
  };
});
