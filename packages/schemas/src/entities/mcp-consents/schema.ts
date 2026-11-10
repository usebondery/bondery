import { z } from "zod";
import { createdAtSchema } from "../_shared/schema.js";
import type { McpConsentListItem, McpConsentsListResponse } from "./types.js";

export const mcpConsentListItemSchema = z.object({
  clientId: z.string().describe("OAuth client identifier"),
  clientName: z.string().describe("Display name of the MCP client"),
  createdAt: createdAtSchema,
  id: z.string().uuid().describe("Consent identifier"),
  logoUri: z.string().url().nullable().describe("Client logo URL"),
  scopes: z.array(z.string()).describe("Granted OAuth scopes"),
}) satisfies z.ZodType<McpConsentListItem>;

export const mcpConsentsListResponseSchema: z.ZodType<McpConsentsListResponse> = z.object({
  consents: z.array(mcpConsentListItemSchema).describe("MCP client consents for this account"),
  totalCount: z.number().describe("Total records that match the query"),
});
