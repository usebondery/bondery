import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type { mcpConsentListItemSchema, mcpConsentsListResponseSchema } from "./schema.js";
import type { McpConsentListItem, McpConsentsListResponse } from "./types.js";

type _McpConsentListItem = Assert<
  IsEqual<McpConsentListItem, z.infer<typeof mcpConsentListItemSchema>>
>;
type _McpConsentsListResponse = Assert<
  IsEqual<McpConsentsListResponse, z.infer<typeof mcpConsentsListResponseSchema>>
>;
