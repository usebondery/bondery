import "server-only";

import { isApiUnavailableResponseStatus } from "@/lib/api/availability";
import { joinApiUrl, resolveServerApiBaseUrl } from "@/lib/api/resolveServerApiUrl";
import {
  ME_SESSION_API_PATH,
  type MeSessionData,
  parseMeSession,
} from "@/lib/api/resources/meSession";
import { serverApiFetch } from "@/lib/api/server";

async function probeMeSessionResponse(response: Response): Promise<MeSessionProbeResult> {
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
}

export type MeSessionProbeResult =
  | { status: "ok"; session: MeSessionData }
  | { status: "unauthorized" }
  | { status: "unavailable" };

/** Routing probe with an explicit bearer token (avoids resolveServerSession recursion). */
export async function probeMeSessionWithAccessToken(
  accessToken: string,
): Promise<MeSessionProbeResult> {
  try {
    const response = await fetch(joinApiUrl(resolveServerApiBaseUrl(), ME_SESSION_API_PATH), {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return await probeMeSessionResponse(response);
  } catch {
    return { status: "unavailable" };
  }
}

/** Routing probe: tri-state outcome without transport redirects. */
export async function probeMeSessionServer(): Promise<MeSessionProbeResult> {
  try {
    const response = await serverApiFetch(ME_SESSION_API_PATH, undefined, {
      cache: "no-store",
      transportPolicy: false,
    });

    return await probeMeSessionResponse(response);
  } catch {
    return { status: "unavailable" };
  }
}
