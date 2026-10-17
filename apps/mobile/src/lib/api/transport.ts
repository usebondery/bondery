import { buildApiErrorFromResponse } from "@bondery/helpers/api";
import { getAccessToken } from "../auth/client";
import { AuthRequiredError, endLocalSession } from "../auth/session";
import { API_URL } from "../config";
import { throwTransportUnavailableError } from "./transport-unavailable-error";

export async function getBearerHeaders(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    throw new AuthRequiredError("missing_local_session");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function mobileFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    throw await throwTransportUnavailableError(error);
  }
}

export async function throwApiResponseError(params: {
  status: number;
  bodyText: string;
  contentType?: string | null;
}): Promise<never> {
  if (params.status === 401) {
    await endLocalSession({ reason: "session_expired" });
  }

  throw buildApiErrorFromResponse({
    bodyText: params.bodyText,
    status: params.status,
  });
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error("BONDERY_PUBLIC_API_URL is not configured");
  }

  const authHeaders = await getBearerHeaders();
  const hasJsonBody = init?.body !== undefined && init?.body !== null && init?.body !== "";

  const headers: Record<string, string> = {
    ...(authHeaders as Record<string, string>),
    ...((init?.headers as Record<string, string>) || {}),
  };

  if (hasJsonBody && headers["Content-Type"] === undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await mobileFetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    await throwApiResponseError({
      bodyText: text,
      contentType: response.headers.get("content-type"),
      status: response.status,
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}
