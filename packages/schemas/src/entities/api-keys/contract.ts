import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  apiKeyCreatedSchema,
  apiKeyListItemSchema,
  apiKeyPermissionSchema,
  apiKeysListResponseSchema,
  createApiKeyInputSchema,
  updateApiKeyLabelInputSchema,
} from "./schema.js";
import type {
  ApiKeyCreated,
  ApiKeyListItem,
  ApiKeyPermission,
  ApiKeysListResponse,
  CreateApiKeyInput,
  UpdateApiKeyLabelInput,
} from "./types.js";

export type _ApiKeyPermission = Assert<
  IsEqual<ApiKeyPermission, z.infer<typeof apiKeyPermissionSchema>>
>;
export type _CreateApiKeyInput = Assert<
  IsEqual<CreateApiKeyInput, z.infer<typeof createApiKeyInputSchema>>
>;
export type _UpdateApiKeyLabelInput = Assert<
  IsEqual<UpdateApiKeyLabelInput, z.infer<typeof updateApiKeyLabelInputSchema>>
>;
export type _ApiKeyListItem = Assert<IsEqual<ApiKeyListItem, z.infer<typeof apiKeyListItemSchema>>>;
export type _ApiKeyCreated = Assert<IsEqual<ApiKeyCreated, z.infer<typeof apiKeyCreatedSchema>>>;
export type _ApiKeysListResponse = Assert<
  IsEqual<ApiKeysListResponse, z.infer<typeof apiKeysListResponseSchema>>
>;
