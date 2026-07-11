import "server-only";

import { isApiUnavailableResponseStatus } from "@/lib/api/availability";
import {
  ME_SESSION_API_PATH,
  type MeSessionData,
  parseMeSession,
} from "@/lib/api/resources/meSession";
import { serverApiFetch } from "@/lib/api/server";

export type MeSessionProbeResult =
  | { status: "ok"; session: MeSessionData }
  | { status: "unauthorized" }
  | { status: "unavailable" };

/** Routing probe: tri-state outcome without transport redirects. */
export async function probeMeSessionServer(): Promise<MeSessionProbeResult> {
  try {
    const response = await serverApiFetch(ME_SESSION_API_PATH, undefined, {
      cache: "no-store",
      transportPolicy: false,
    });

    if (response.status === 401) {
      return { status: "unauthorized" };
    }

    if (isApiUnavailableResponseStatus(response.status)) {
      return { status: "unavailable" };
    }

    if (response.ok) {
      const result = (await response.json()) as Parameters<typeof parseMeSession>[0];
      return {
        session: parseMeSession(result),
        status: "ok",
      };
    }

    return { status: "unavailable" };
  } catch {
    return { status: "unavailable" };
  }
}
