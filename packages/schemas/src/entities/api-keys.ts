import { z } from "zod";
import { API_KEY_LIMITS, API_KEY_PERMISSIONS } from "../constants/index.js";
import { labelFieldSchema } from "./_shared.js";

export const apiKeyPermissionSchema = z.enum(API_KEY_PERMISSIONS);

export const createApiKeyInputSchema = z.object({
  label: labelFieldSchema(API_KEY_LIMITS.labelMaxLength),
  permission: apiKeyPermissionSchema.default("full"),
});

export const updateApiKeyLabelInputSchema = z.object({
  label: labelFieldSchema(API_KEY_LIMITS.labelMaxLength),
});

export const apiKeyListItemSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  permission: apiKeyPermissionSchema,
  keyPrefix: z.string(),
  lastUsedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const apiKeyCreatedSchema = apiKeyListItemSchema.extend({
  secret: z.string(),
});

export const apiKeysListResponseSchema = z.object({
  apiKeys: z.array(apiKeyListItemSchema),
  totalCount: z.number(),
});

export type ApiKeyPermission = z.infer<typeof apiKeyPermissionSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeyInputSchema>;
export type UpdateApiKeyLabelInput = z.infer<typeof updateApiKeyLabelInputSchema>;
export type ApiKeyListItem = z.infer<typeof apiKeyListItemSchema>;
export type ApiKeyCreated = z.infer<typeof apiKeyCreatedSchema>;
export type ApiKeysListResponse = z.infer<typeof apiKeysListResponseSchema>;
