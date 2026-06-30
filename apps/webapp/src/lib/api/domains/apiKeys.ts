import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type {
  ApiKeyCreated,
  ApiKeyListItem,
  ApiKeysListResponse,
  CreateApiKeyInput,
  UpdateApiKeyLabelInput,
} from "@bondery/schemas";
import { clientApiJson } from "@/lib/api/client";

export async function listApiKeys(): Promise<ApiKeysListResponse> {
  return clientApiJson<ApiKeysListResponse>(API_ROUTES.ME_API_KEYS);
}

export async function createApiKey(body: CreateApiKeyInput): Promise<ApiKeyCreated> {
  return clientApiJson<ApiKeyCreated>(API_ROUTES.ME_API_KEYS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateApiKeyLabel(
  id: string,
  patch: UpdateApiKeyLabelInput,
): Promise<ApiKeyListItem> {
  return clientApiJson<ApiKeyListItem>(`${API_ROUTES.ME_API_KEYS}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function deleteApiKey(id: string): Promise<void> {
  await clientApiJson(`${API_ROUTES.ME_API_KEYS}/${id}`, {
    method: "DELETE",
  });
}
