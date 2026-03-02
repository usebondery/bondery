/**
 * API Client for Chrome Extension
 *
 * Makes authenticated API calls to the Bondery API using OAuth access tokens.
 * All calls go through the service worker which has access to stored tokens.
 */

import { config } from "../config";
import { getAccessToken, clearTokens } from "./auth";
import type { RedirectRequest, RedirectResponse } from "@bondery/types";
import { API_ROUTES } from "@bondery/helpers";

export interface SocialLookupResult {
  exists: boolean;
  contact?: {
    id: string;
    firstName: string;
    lastName: string | null;
    avatar: string | null;
  };
}

export interface UserSettingsProfile {
  id?: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

/**
 * Create or find a contact via the redirect API endpoint.
 * This is the same endpoint the extension previously used via browser redirect,
 * but now called directly with an OAuth bearer token.
 *
 * When the person already exists, the response includes preview data
 * (firstName, lastName, avatar) so we can show a preview popup without an extra call.
 *
 * @param data - Profile data scraped from social media
 * @returns Response with contactId and whether the person existed
 * @throws Error if not authenticated or request fails
 */
export async function addOrFindPerson(data: RedirectRequest): Promise<RedirectResponse> {
  const token = await getAccessToken();

  if (!token) {
    throw new AuthRequiredError("Not authenticated");
  }

  const response = await fetch(`${config.apiUrl}${API_ROUTES.REDIRECT}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (response.status === 401) {
    // Token was rejected — clear stored tokens
    await clearTokens();
    throw new AuthRequiredError("Session expired");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

/**
 * Find an existing contact by social media platform + handle.
 */
export async function findPersonBySocial(
  platform: "instagram" | "linkedin" | "facebook",
  handle: string,
): Promise<SocialLookupResult> {
  const token = await getAccessToken();

  if (!token) {
    throw new AuthRequiredError("Not authenticated");
  }

  const url = new URL(`${config.apiUrl}${API_ROUTES.CONTACTS}/by-social`);
  url.searchParams.set("platform", platform);
  url.searchParams.set("handle", handle);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    await clearTokens();
    throw new AuthRequiredError("Session expired");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

/**
 * Fetch basic person data for display in the preview popup.
 *
 * @param contactId - The contact ID to look up
 * @returns Partial contact data for preview
 */
export async function fetchPersonPreview(
  contactId: string,
): Promise<{ firstName: string; lastName: string | null; avatar: string | null }> {
  const token = await getAccessToken();

  if (!token) {
    throw new AuthRequiredError("Not authenticated");
  }

  const response = await fetch(`${config.apiUrl}${API_ROUTES.CONTACTS}/${contactId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    await clearTokens();
    throw new AuthRequiredError("Session expired");
  }

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  const data = await response.json();
  const contact = data.contact ?? data;

  return {
    firstName: contact.firstName ?? contact.first_name ?? "Unknown",
    lastName: contact.lastName ?? contact.last_name ?? null,
    avatar: contact.avatar ?? null,
  };
}

/**
 * Fetch authenticated user's settings/profile data.
 */
export async function fetchUserSettings(): Promise<UserSettingsProfile> {
  const token = await getAccessToken();

  if (!token) {
    throw new AuthRequiredError("Not authenticated");
  }

  const response = await fetch(`${config.apiUrl}${API_ROUTES.SETTINGS}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    await clearTokens();
    throw new AuthRequiredError("Session expired");
  }

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  const result = await response.json();
  const settings = result?.data ?? {};

  return {
    id: settings.id ?? undefined,
    email: settings.email ?? null,
    name: settings.name ?? null,
    avatarUrl: settings.avatar_url ?? null,
  };
}

/**
 * Custom error class for authentication-required scenarios.
 * The service worker uses this to distinguish auth errors from other failures.
 */
export class AuthRequiredError extends Error {
  readonly requiresAuth = true;

  constructor(message: string) {
    super(message);
    this.name = "AuthRequiredError";
  }
}
