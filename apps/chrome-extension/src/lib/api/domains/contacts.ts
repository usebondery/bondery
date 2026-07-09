import { API_ROUTES } from "@bondery/helpers";
import type { EnrichContactRequest, RedirectRequest, RedirectResponse } from "@bondery/schemas";
import { config } from "../../../config";
import { authenticatedFetch } from "../transport";

export interface SocialLookupResult {
  contact?: {
    id: string;
    firstName: string;
    lastName: string | null;
    avatar: string | null;
  };
  exists: boolean;
}

export async function addOrFindPerson(data: RedirectRequest): Promise<RedirectResponse> {
  const response = await authenticatedFetch(`${config.apiUrl}${API_ROUTES.EXTENSION}`, {
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export async function findPersonBySocial(
  platform: "instagram" | "linkedin" | "facebook",
  handle: string,
): Promise<SocialLookupResult> {
  const url = new URL(`${config.apiUrl}${API_ROUTES.CONTACTS}/by-social`);
  url.searchParams.set("platform", platform);
  url.searchParams.set("handle", handle);

  const response = await authenticatedFetch(url.toString(), {
    method: "GET",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export async function fetchPersonPreview(
  contactId: string,
): Promise<{ firstName: string; lastName: string | null; avatar: string | null }> {
  const response = await authenticatedFetch(`${config.apiUrl}${API_ROUTES.CONTACTS}/${contactId}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }

  const data = await response.json();
  const contact = data.contact ?? data;

  return {
    avatar: contact.avatar ?? null,
    firstName: contact.firstName ?? contact.first_name ?? "Unknown",
    lastName: contact.lastName ?? contact.last_name ?? null,
  };
}

export async function upsertLinkedInData(
  contactId: string,
  workHistory: Array<{
    title: string;
    companyName: string;
    companyLinkedinId?: string;
    startDate?: string;
    endDate?: string;
    employmentType?: string;
    location?: string;
  }>,
): Promise<void> {
  const response = await authenticatedFetch(
    `${config.apiUrl}${API_ROUTES.CONTACTS}/${contactId}/linkedin-data`,
    {
      body: JSON.stringify({ workHistory }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }
}

export async function enrichPersonFromLinkedIn(
  contactId: string,
  data: EnrichContactRequest,
): Promise<void> {
  const response = await authenticatedFetch(
    `${config.apiUrl}${API_ROUTES.CONTACTS}/${contactId}/enrich`,
    {
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error ${response.status}: ${errorBody}`);
  }
}
