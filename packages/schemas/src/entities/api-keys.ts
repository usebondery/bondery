import { z } from "zod";
import { API_KEY_LIMITS, API_KEY_PERMISSIONS } from "#constants/index.js";
import { labelFieldSchema } from "#entities/_shared.js";
import {
  EXAMPLE_API_KEY_CREATED_RESPONSE,
  EXAMPLE_API_KEYS_LIST_RESPONSE,
} from "#openapi/fixtures/responses.js";

export const apiKeyPermissionSchema = z.enum(API_KEY_PERMISSIONS);

export const createApiKeyInputSchema = z.object({
  label: labelFieldSchema(API_KEY_LIMITS.labelMaxLength),
  permission: apiKeyPermissionSchema.default("full"),
});

export const updateApiKeyLabelInputSchema = z.object({
  label: labelFieldSchema(API_KEY_LIMITS.labelMaxLength),
});

export const apiKeyListItemSchema = z
  .object({
    id: z.string().uuid(),
    label: z.string(),
    permission: apiKeyPermissionSchema,
    keyPrefix: z.string(),
    lastUsedAt: z.string().nullable(),
    createdAt: z.string(),
  })
  .meta({ example: EXAMPLE_API_KEYS_LIST_RESPONSE.apiKeys[0] });

export const apiKeyCreatedSchema = apiKeyListItemSchema
  .extend({
    secret: z.string(),
  })
  .meta({ example: EXAMPLE_API_KEY_CREATED_RESPONSE });

export const apiKeysListResponseSchema = z
  .object({
    apiKeys: z.array(apiKeyListItemSchema),
    totalCount: z.number(),
  })
  .meta({ example: EXAMPLE_API_KEYS_LIST_RESPONSE });

export type ApiKeyPermission = z.infer<typeof apiKeyPermissionSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeyInputSchema>;
export type UpdateApiKeyLabelInput = z.infer<typeof updateApiKeyLabelInputSchema>;
export type ApiKeyListItem = z.infer<typeof apiKeyListItemSchema>;
export type ApiKeyCreated = z.infer<typeof apiKeyCreatedSchema>;
export type ApiKeysListResponse = z.infer<typeof apiKeysListResponseSchema>;
