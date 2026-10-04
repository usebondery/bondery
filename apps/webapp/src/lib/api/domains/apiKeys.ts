import { BONDERY_STEP_UP_HEADER } from "@bondery/helpers/globals/paths";
import type {
  ApiKeyCreated,
  ApiKeyListItem,
  CreateApiKeyInput,
  UpdateApiKeyLabelInput,
} from "@bondery/schemas";
import { clientApiJson } from "@/lib/api/client";
import { API_KEYS_API_PATH, parseApiKeysList } from "@/lib/api/resources/apiKeys";

export async function getApiKeys(): Promise<ApiKeyListItem[]> {
  const raw = await clientApiJson<{ apiKeys?: ApiKeyListItem[] }>(API_KEYS_API_PATH);
  return parseApiKeysList(raw);
}

export async function createApiKey(
  body: CreateApiKeyInput,
  stepUpToken: string,
): Promise<ApiKeyCreated> {
  return clientApiJson<ApiKeyCreated>(API_KEYS_API_PATH, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      [BONDERY_STEP_UP_HEADER]: stepUpToken,
    },
    method: "POST",
  });
}

export async function updateApiKeyLabel(
  id: string,
  patch: UpdateApiKeyLabelInput,
): Promise<ApiKeyListItem> {
  return clientApiJson<ApiKeyListItem>(`${API_KEYS_API_PATH}/${id}`, {
    body: JSON.stringify(patch),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
}

export async function deleteApiKey(id: string, stepUpToken: string): Promise<void> {
  await clientApiJson(`${API_KEYS_API_PATH}/${id}`, {
    headers: { [BONDERY_STEP_UP_HEADER]: stepUpToken },
    method: "DELETE",
  });
}
