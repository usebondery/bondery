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
import { clientApiJson } from "@/lib/api/client";

export async function parseVCardImport(formData: FormData): Promise<VCardParseResponse> {
  return clientApiJson<VCardParseResponse>(`${API_ROUTES.CONTACTS_IMPORT_VCARD}/parse`, {
    body: formData,
    method: "POST",
  });
}

export async function commitVCardImport(
  body: VCardImportCommitRequest,
): Promise<VCardImportCommitResponse> {
  return clientApiJson<VCardImportCommitResponse>(`${API_ROUTES.CONTACTS_IMPORT_VCARD}/commit`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export async function parseLinkedInImport(formData: FormData): Promise<LinkedInParseResponse> {
  return clientApiJson<LinkedInParseResponse>(`${API_ROUTES.CONTACTS_IMPORT_LINKEDIN}/parse`, {
    body: formData,
    method: "POST",
  });
}

export async function commitLinkedInImport(
  body: LinkedInImportCommitRequest,
): Promise<LinkedInImportCommitResponse> {
  return clientApiJson<LinkedInImportCommitResponse>(
    `${API_ROUTES.CONTACTS_IMPORT_LINKEDIN}/commit`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}

export async function parseInstagramImport(formData: FormData): Promise<InstagramParseResponse> {
  return clientApiJson<InstagramParseResponse>(`${API_ROUTES.CONTACTS_IMPORT_INSTAGRAM}/parse`, {
    body: formData,
    method: "POST",
  });
}

export async function commitInstagramImport(
  body: InstagramImportCommitRequest,
): Promise<InstagramImportCommitResponse> {
  return clientApiJson<InstagramImportCommitResponse>(
    `${API_ROUTES.CONTACTS_IMPORT_INSTAGRAM}/commit`,
    {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
}
