import { cache } from "react";
import type { MeSessionData } from "@/lib/api/resources/meSession";
import { getRequestSession } from "@/lib/auth/getRequestSession";

export type { MeSessionData } from "@/lib/api/resources/meSession";

export type AppSessionResult =
  | { status: "ok"; session: MeSessionData }
  | { status: "unauthorized" }
  | { status: "unavailable" };

/**
 * Shell read model derived from {@link getRequestSession}.
 *
 * Wrapped in React cache() so it executes at most once per server render.
 * Not a route gate — layouts use getRequestSession() directly.
 */
export const getAppSession = cache(async (): Promise<AppSessionResult> => {
  const session = await getRequestSession();

  if (session.kind === "anonymous") {
    return { status: "unauthorized" };
  }

  if (session.api !== "ok" || !session.shell) {
    return { status: "unavailable" };
  }

  return {
    session: session.shell,
    status: "ok",
  };
});
