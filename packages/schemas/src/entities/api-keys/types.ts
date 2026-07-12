export type ApiKeyPermission = "read" | "full";

export interface CreateApiKeyInput {
  label: string;
  permission: ApiKeyPermission;
}

export interface UpdateApiKeyLabelInput {
  label: string;
}

export interface ApiKeyListItem {
  createdAt: string;
  id: string;
  keyPrefix: string;
  label: string;
  lastUsedAt: string | null;
  permission: ApiKeyPermission;
}

export interface ApiKeyCreated extends ApiKeyListItem {
  secret: string;
}

export interface ApiKeysListResponse {
  apiKeys: ApiKeyListItem[];
  totalCount: number;
}
