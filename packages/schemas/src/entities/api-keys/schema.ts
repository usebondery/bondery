import { z } from "zod";
import { API_KEY_BA_ACTIONS, API_KEY_LIMITS, API_KEY_PERMISSIONS } from "#constants/index.js";
import { createdAtSchema, labelFieldSchema, nullableDateTimeSchema } from "../_shared/schema.js";
import type {
  ApiKeyBaAction,
  ApiKeyCreated,
  ApiKeyListItem,
  ApiKeyPermission,
  ApiKeysListResponse,
  CreateApiKeyInput,
  UpdateApiKeyLabelInput,
} from "./types.js";

export const apiKeyBaActionSchema: z.ZodType<ApiKeyBaAction> = z.enum(API_KEY_BA_ACTIONS);

export const apiKeyPermissionSchema: z.ZodType<ApiKeyPermission> = z.enum(API_KEY_PERMISSIONS);

export const createApiKeyInputSchema: z.ZodType<CreateApiKeyInput> = z.object({
  label: labelFieldSchema(API_KEY_LIMITS.labelMaxLength).describe("Display name for this API key"),
  permission: apiKeyPermissionSchema.default("read").describe("Access level for this API key"),
});

export const updateApiKeyLabelInputSchema: z.ZodType<UpdateApiKeyLabelInput> = z.object({
  label: labelFieldSchema(API_KEY_LIMITS.labelMaxLength).describe("Display name for this API key"),
});

export const apiKeyListItemSchema = z.object({
  createdAt: createdAtSchema,
  id: z.string().uuid().describe("API key identifier"),
  keyPrefix: z.string().describe("Visible prefix of the secret"),
  label: z.string().describe("Display name for this API key"),
  lastUsedAt: nullableDateTimeSchema.describe("Time this key was last used"),
  permission: apiKeyPermissionSchema.describe("Access level for this API key"),
}) satisfies z.ZodType<ApiKeyListItem>;

export const apiKeyCreatedSchema = apiKeyListItemSchema.extend({
  secret: z.string().describe("Full API key secret. Shown only at creation time."),
}) satisfies z.ZodType<ApiKeyCreated>;

export const apiKeysListResponseSchema: z.ZodType<ApiKeysListResponse> = z.object({
  apiKeys: z.array(apiKeyListItemSchema).describe("API keys for this account"),
  totalCount: z.number().describe("Total records that match the query"),
});
