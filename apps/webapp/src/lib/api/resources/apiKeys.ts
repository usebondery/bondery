import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { ApiKeyListItem } from "@bondery/schemas";

export const API_KEYS_API_PATH = API_ROUTES.ME_API_KEYS;

export function parseApiKeysList(raw: { apiKeys?: ApiKeyListItem[] }): ApiKeyListItem[] {
  return raw.apiKeys ?? [];
}
