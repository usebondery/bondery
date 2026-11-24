import { buildApiErrorFromResponse } from "@bondery/helpers/api";
import { mobileFetch } from "../api/transport";
import { endLocalSession, readLocalAccessToken } from "../auth/local-session";
import { AuthRequiredError } from "../auth/session";
import { API_URL } from "../config";
import { syncRequestHeaders } from "./constants";
import { type PullSessionGeneration, syncSessionGuard } from "./pull-session-guard";

type PullSession = {
  accessToken: string;
  generation: PullSessionGeneration;
};

async function getSyncAccessToken(): Promise<string | null> {
  return readLocalAccessToken();
}

async function delay(ms: number, signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      resolve();
    }, ms);

    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

async function isCurrentPullSession(session: PullSession): Promise<boolean> {
  if (!syncSessionGuard.isCurrent(session.generation)) {
    return false;
  }
  const accessToken = await getSyncAccessToken();
  return syncSessionGuard.isCurrentSession(session.generation, session.accessToken, accessToken);
}

async function syncFetch<T>(
  path: string,
  generation: PullSessionGeneration,
  signal?: AbortSignal,
): Promise<{ payload: T; session: PullSession } | null> {
  const token = await getSyncAccessToken();
  if (!token) {
    throw new AuthRequiredError("missing_local_session");
  }
  const session = { accessToken: token, generation };
  if (!(await isCurrentPullSession(session))) {
    return null;
  }

  const response = await mobileFetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...syncRequestHeaders(),
    },
    signal,
  });

  if (!(await isCurrentPullSession(session))) {
    return null;
  }

  if (response.status === 401) {
    await endLocalSession({ reason: "session_expired" });
    throw new AuthRequiredError("session_revoked");
  }

  if (!response.ok) {
    const text = await response.text();
    throw buildApiErrorFromResponse({
      bodyText: text,
      status: response.status,
    });
  }

  return {
    payload: (await response.json()) as T,
    session,
  };
}

export type { PullSession };
export { delay, isCurrentPullSession, syncFetch };
