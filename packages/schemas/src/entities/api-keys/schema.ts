import { z } from "zod";
import { API_KEY_LIMITS, API_KEY_PERMISSIONS } from "#constants/index.js";
import { createdAtSchema, labelFieldSchema, nullableDateTimeSchema } from "../_shared/schema.js";
import type {
  ApiKeyCreated,
  ApiKeyListItem,
  ApiKeyPermission,
  ApiKeysListResponse,
  CreateApiKeyInput,
  UpdateApiKeyLabelInput,
} from "./types.js";

export const apiKeyPermissionSchema: z.ZodType<ApiKeyPermission> = z.enum(API_KEY_PERMISSIONS);

export const createApiKeyInputSchema: z.ZodType<CreateApiKeyInput> = z.object({
  label: labelFieldSchema(API_KEY_LIMITS.labelMaxLength),
  permission: apiKeyPermissionSchema.default("full"),
});

export const updateApiKeyLabelInputSchema: z.ZodType<UpdateApiKeyLabelInput> = z.object({
  label: labelFieldSchema(API_KEY_LIMITS.labelMaxLength),
});

export const apiKeyListItemSchema = z.object({
  createdAt: createdAtSchema,
  id: z.string().uuid(),
  keyPrefix: z.string(),
  label: z.string(),
  lastUsedAt: nullableDateTimeSchema,
  permission: apiKeyPermissionSchema,
}) satisfies z.ZodType<ApiKeyListItem>;

export const apiKeyCreatedSchema = apiKeyListItemSchema.extend({
  secret: z.string(),
}) satisfies z.ZodType<ApiKeyCreated>;

export const apiKeysListResponseSchema: z.ZodType<ApiKeysListResponse> = z.object({
  apiKeys: z.array(apiKeyListItemSchema),
  totalCount: z.number(),
});
