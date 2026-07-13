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

type _ApiKeyPermission = Assert<IsEqual<ApiKeyPermission, z.infer<typeof apiKeyPermissionSchema>>>;
type _CreateApiKeyInput = Assert<
  IsEqual<CreateApiKeyInput, z.infer<typeof createApiKeyInputSchema>>
>;
type _UpdateApiKeyLabelInput = Assert<
  IsEqual<UpdateApiKeyLabelInput, z.infer<typeof updateApiKeyLabelInputSchema>>
>;
type _ApiKeyListItem = Assert<IsEqual<ApiKeyListItem, z.infer<typeof apiKeyListItemSchema>>>;
type _ApiKeyCreated = Assert<IsEqual<ApiKeyCreated, z.infer<typeof apiKeyCreatedSchema>>>;
type _ApiKeysListResponse = Assert<
  IsEqual<ApiKeysListResponse, z.infer<typeof apiKeysListResponseSchema>>
>;
