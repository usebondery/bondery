import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type {
  InstagramImportCommitRequest,
  InstagramImportCommitResponse,
  InstagramParseResponse,
  LinkedInImportCommitRequest,
  LinkedInImportCommitResponse,
  LinkedInParseResponse,
  VCardImportCommitRequest,
  VCardImportCommitResponse,
  VCardParseResponse,
} from "@bondery/schemas";
import { clientApiFetch, clientApiJson } from "@/lib/api/client";

export async function parseVCardImport(formData: FormData): Promise<VCardParseResponse> {
  return clientApiJson<VCardParseResponse>(`${API_ROUTES.CONTACTS_IMPORT_VCARD}/parse`, {
    method: "POST",
    body: formData,
  });
}

export async function commitVCardImport(
  body: VCardImportCommitRequest,
): Promise<VCardImportCommitResponse> {
  return clientApiJson<VCardImportCommitResponse>(`${API_ROUTES.CONTACTS_IMPORT_VCARD}/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function parseLinkedInImport(formData: FormData): Promise<LinkedInParseResponse> {
  return clientApiJson<LinkedInParseResponse>(`${API_ROUTES.CONTACTS_IMPORT_LINKEDIN}/parse`, {
    method: "POST",
    body: formData,
  });
}

export async function commitLinkedInImport(
  body: LinkedInImportCommitRequest,
): Promise<LinkedInImportCommitResponse> {
  return clientApiJson<LinkedInImportCommitResponse>(
    `${API_ROUTES.CONTACTS_IMPORT_LINKEDIN}/commit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

export async function parseInstagramImport(formData: FormData): Promise<InstagramParseResponse> {
  return clientApiJson<InstagramParseResponse>(`${API_ROUTES.CONTACTS_IMPORT_INSTAGRAM}/parse`, {
    method: "POST",
    body: formData,
  });
}

export async function commitInstagramImport(
  body: InstagramImportCommitRequest,
): Promise<InstagramImportCommitResponse> {
  return clientApiJson<InstagramImportCommitResponse>(
    `${API_ROUTES.CONTACTS_IMPORT_INSTAGRAM}/commit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

/** Fire-and-forget merge refresh after import; matches import modal behavior. */
export async function refreshMergeRecommendationsAfterImport(): Promise<void> {
  await clientApiFetch(API_ROUTES.CONTACTS_MERGE_RECOMMENDATIONS_REFRESH, {
    method: "POST",
  }).catch(() => undefined);
}
