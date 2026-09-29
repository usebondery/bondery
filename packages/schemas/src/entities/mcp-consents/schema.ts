import { z } from "zod";
import { createdAtSchema } from "../_shared/schema.js";
import type { McpConsentListItem, McpConsentsListResponse } from "./types.js";

export const mcpConsentListItemSchema = z.object({
  clientId: z.string(),
  clientName: z.string(),
  createdAt: createdAtSchema,
  id: z.string().uuid(),
  scopes: z.array(z.string()),
}) satisfies z.ZodType<McpConsentListItem>;

export const mcpConsentsListResponseSchema: z.ZodType<McpConsentsListResponse> = z.object({
  consents: z.array(mcpConsentListItemSchema),
  totalCount: z.number(),
});
