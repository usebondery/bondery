import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { GEOCODE_SUGGEST_MIN_QUERY_LENGTH } from "@bondery/helpers/address";
import { buildGeocodeSuggestQuery } from "@bondery/helpers/geocode";
import type {
  Contact,
  ContactAddressEntry,
  ShareableField,
  UpdateUserSettingsInput,
  UserSettingsResponse,
} from "@bondery/schemas";
import { parseGeocodeSuggestResponse } from "@bondery/schemas";
import { File, UploadTask, UploadType } from "expo-file-system";
import { API_URL, normalizeMobileUrlForDevice } from "../config";
import { apiRequest, getBearerHeaders, throwApiResponseError } from "./transport";
import { resolveFetchFailureMessage } from "./parseApiErrorBody";

const ALL_SHAREABLE_FIELDS: ShareableField[] = [
  "name",
  "avatar",
  "headline",
  "phones",
  "emails",
  "location",
  "linkedin",
  "instagram",
  "facebook",
  "website",
  "whatsapp",
  "signal",
  "addresses",
  "notes",
  "importantDates",
];

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) {
    return null;
  }

  const match = header.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i);
  if (!match) {
    return null;
  }

  const raw = (match[1] ?? match[2] ?? match[3]).trim();
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function sanitizeVCardFilename(filename: string): string {
  const base = filename
    .replace(/[/\\]/g, "")
    .replace(/[^\w.\- ]/g, "_")
    .trim();

  if (!base) {
    return "contact.vcf";
  }

  return base.toLowerCase().endsWith(".vcf") ? base : `${base}.vcf`;
}

export function buildContactVCardFilename(
  contact: Pick<Contact, "firstName" | "lastName">,
): string {
  const firstName = contact.firstName || "contact";
  const lastName = contact.lastName || "";
  return lastName ? `${firstName}_${lastName}.vcf` : `${firstName}.vcf`;
}

export async function fetchContactVCard(
  contactId: string,
  fallback?: Pick<Contact, "firstName" | "lastName">,
): Promise<{ content: string; filename: string }> {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured");
  }

  const authHeaders = await getBearerHeaders();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${API_ROUTES.CONTACTS}/${contactId}/vcard`, {
      headers: authHeaders,
    });
  } catch (error) {
    throw new Error(await resolveFetchFailureMessage(error));
  }

  if (!response.ok) {
    const text = await response.text();
    await throwApiResponseError({
      status: response.status,
      bodyText: text,
      contentType: response.headers.get("content-type"),
    });
  }

  const content = await response.text();
  const headerFilename = parseContentDispositionFilename(
    response.headers.get("Content-Disposition"),
  );
  const filename = sanitizeVCardFilename(
    headerFilename ?? (fallback ? buildContactVCardFilename(fallback) : "contact.vcf"),
  );

  return { content, filename };
}

export async function uploadContactPhoto(
  id: string,
  uri: string,
  mimeType: string,
): Promise<{ avatarUrl: string }> {
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_API_URL is not configured");
  }

  const authHeaders = await getBearerHeaders();
  const uploadTask = new UploadTask(new File(uri), `${API_URL}${API_ROUTES.CONTACTS}/${id}/photo`, {
    httpMethod: "POST",
    uploadType: UploadType.MULTIPART,
    fieldName: "file",
    mimeType,
    headers: authHeaders,
  });

  let result;
  try {
    result = await uploadTask.uploadAsync();
  } catch (error) {
    throw new Error(await resolveFetchFailureMessage(error));
  }

  if (result.status < 200 || result.status >= 300) {
    await throwApiResponseError({
      status: result.status,
      bodyText: result.body ?? "",
    });
  }

  const data = JSON.parse(result.body) as { avatarUrl: string };
  return {
    avatarUrl: normalizeMobileUrlForDevice(data.avatarUrl),
  };
}

export async function deleteContactPhoto(id: string): Promise<void> {
  await apiRequest<{ success: true }>(`${API_ROUTES.CONTACTS}/${id}/photo`, {
    method: "DELETE",
  });
}

export async function fetchSettings(): Promise<UserSettingsResponse> {
  const response = await apiRequest<UserSettingsResponse>(API_ROUTES.ME_SETTINGS);

  return {
    ...response,
    data: {
      ...response.data,
      avatarUrl: response.data.avatarUrl
        ? normalizeMobileUrlForDevice(response.data.avatarUrl)
        : response.data.avatarUrl,
    },
  };
}

export async function updateSettings(input: UpdateUserSettingsInput): Promise<{
  success: boolean;
  data: UserSettingsResponse["data"];
}> {
  return apiRequest(API_ROUTES.ME_SETTINGS, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteMyAccount(): Promise<void> {
  await apiRequest<{ success: true }>(API_ROUTES.ME, {
    method: "DELETE",
  });
}

export async function fetchGeocodeSuggestions(
  query: string,
  mode: "address" | "place" = "address",
  signal?: AbortSignal,
): Promise<ContactAddressEntry[]> {
  const trimmed = query.trim();
  if (trimmed.length < GEOCODE_SUGGEST_MIN_QUERY_LENGTH) return [];

  const result = await apiRequest(
    `${API_ROUTES.GEOCODE_SUGGEST}?${buildGeocodeSuggestQuery(trimmed, mode)}`,
    { signal },
  );
  return parseGeocodeSuggestResponse(result);
}

export async function shareContactEmail(input: {
  personId: string;
  recipientEmails: string[];
  message?: string;
}): Promise<void> {
  await apiRequest<{ success: boolean }>(API_ROUTES.CONTACTS_SHARE, {
    method: "POST",
    body: JSON.stringify({
      personId: input.personId,
      recipientEmails: input.recipientEmails,
      message: input.message,
      selectedFields: ALL_SHAREABLE_FIELDS,
    }),
  });
}
