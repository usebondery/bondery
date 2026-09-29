import {
  contactsListResponseSchema,
  createContactResponseSchema,
  keepInTouchCountResponseSchema,
} from "@bondery/schemas";
import type { McpServer } from "@modelcontextprotocol/server";
import type { JWTPayload } from "jose";
import type { DomainContext } from "../../../domains/_shared/context.js";
import {
  executeGetKeepInTouchContacts,
  executeGetKeepInTouchCount,
  executeUpdateKeepInTouch,
  getKeepInTouchContactsInputSchema,
  getKeepInTouchCountInputSchema,
  updateKeepInTouchInputSchema,
} from "../../../services/assistant-tools/keep-in-touch.js";
import { mcpJsonResult, runMcpTool } from "./json.js";
import { mcpToolMeta } from "./mcp-tool-meta.js";
import { runMcpWriteTool } from "./mcp-write.js";

export function registerKeepInTouchMcpTools(
  server: McpServer,
  ctx: DomainContext,
  claims: JWTPayload,
): void {
  server.registerTool(
    "get_keep_in_touch_count",
    {
      ...mcpToolMeta("get", "Get keep-in-touch count"),
      description: "Get how many keep-in-touch contacts are overdue for the signed-in user.",
      inputSchema: getKeepInTouchCountInputSchema,
      outputSchema: keepInTouchCountResponseSchema,
    },
    async () => runMcpTool(ctx, async () => mcpJsonResult(await executeGetKeepInTouchCount(ctx))),
  );

  server.registerTool(
    "get_keep_in_touch_contacts",
    {
      ...mcpToolMeta("get", "Get keep-in-touch contacts"),
      description:
        "Get contacts that have a keep-in-touch cadence. Optional search; offset paging; at most 25.",
      inputSchema: getKeepInTouchContactsInputSchema,
      outputSchema: contactsListResponseSchema,
    },
    async (args) =>
      runMcpTool(ctx, async () => mcpJsonResult(await executeGetKeepInTouchContacts(ctx, args))),
  );

  server.registerTool(
    "update_keep_in_touch",
    {
      ...mcpToolMeta("update", "Update keep-in-touch"),
      description:
        "Set or clear a contact's keep-in-touch cadence and/or last interaction. Requires mcp:write.",
      inputSchema: updateKeepInTouchInputSchema,
      outputSchema: createContactResponseSchema,
    },
    async (args) =>
      runMcpWriteTool(claims, ctx, async () =>
        mcpJsonResult(await executeUpdateKeepInTouch(ctx, args)),
      ),
  );
}
