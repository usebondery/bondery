import { buildApiErrorFromResponse } from "@bondery/helpers/api";
import { API_URL } from "../config";
import { supabase } from "../supabase/client";
import { resolveFetchFailureMessage } from "./parseApiErrorBody";

export async function getBearerHeaders(): Promise<Record<string, string>> {
  if (!supabase) {
    throw new Error(
      "Missing mobile env config. Set EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL, and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error("No authenticated mobile session found.");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function mobileFetch(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new Error(await resolveFetchFailureMessage(error));
  }
}

let isSigningOutLocally = false;

async function invalidateSessionOnUnauthorized(): Promise<void> {
  if (!supabase || isSigningOutLocally) {
    return;
  }

  isSigningOutLocally = true;
  try {
    await supabase.auth.signOut({ scope: "local" });
  } finally {
    isSigningOutLocally = false;
  }
}

export async function throwApiResponseError(params: {
  status: number;
  bodyText: string;
  contentType?: string | null;
}): Promise<never> {
  if (params.status === 401) {
    await invalidateSessionOnUnauthorized();
  }

  throw buildApiErrorFromResponse({
    bodyText: params.bodyText,
    status: params.status,
  });
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured");
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
