import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { mcpConsentListItemSchema, mcpConsentsListResponseSchema } from "./schema.js";
import type { McpConsentListItem, McpConsentsListResponse } from "./types.js";

export type _McpConsentListItem = Assert<
  IsEqual<McpConsentListItem, z.infer<typeof mcpConsentListItemSchema>>
>;
export type _McpConsentsListResponse = Assert<
  IsEqual<McpConsentsListResponse, z.infer<typeof mcpConsentsListResponseSchema>>
>;
