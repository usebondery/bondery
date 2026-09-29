import {
  importantDatesListResponseSchema,
  upcomingRemindersResponseSchema,
} from "@bondery/schemas";
import type { McpServer } from "@modelcontextprotocol/server";
import type { JWTPayload } from "jose";
import type { DomainContext } from "../../../domains/_shared/context.js";
import {
  executeGetImportantDates,
  executeGetUpcomingReminders,
  executeUpdateImportantDates,
  getImportantDatesInputSchema,
  getUpcomingRemindersInputSchema,
  updateImportantDatesInputSchema,
} from "../../../services/assistant-tools/important-dates.js";
import { mcpJsonResult, runMcpTool } from "./json.js";
import { mcpToolMeta } from "./mcp-tool-meta.js";
import { runMcpWriteTool } from "./mcp-write.js";

export function registerImportantDateMcpTools(
  server: McpServer,
  ctx: DomainContext,
  claims: JWTPayload,
): void {
  server.registerTool(
    "get_important_dates",
    {
      ...mcpToolMeta("get", "Get important dates"),
      description: "Get important dates for a contact that belongs to the signed-in user.",
      inputSchema: getImportantDatesInputSchema,
      outputSchema: importantDatesListResponseSchema,
    },
    async (args) =>
      runMcpTool(ctx, async () => mcpJsonResult(await executeGetImportantDates(ctx, args))),
  );

  server.registerTool(
    "update_important_dates",
    {
      ...mcpToolMeta("update", "Replace important dates"),
      description:
        "Replace all important dates for a contact you own, including an empty list. Requires mcp:write.",
      inputSchema: updateImportantDatesInputSchema,
      outputSchema: importantDatesListResponseSchema,
    },
    async (args) =>
      runMcpWriteTool(claims, ctx, async () =>
        mcpJsonResult(await executeUpdateImportantDates(ctx, args)),
      ),
  );

  server.registerTool(
    "get_upcoming_reminders",
    {
      ...mcpToolMeta("get", "Get upcoming reminders"),
      description:
        "Get upcoming important-date reminders with notifications configured (next month; at most 25).",
      inputSchema: getUpcomingRemindersInputSchema,
      outputSchema: upcomingRemindersResponseSchema,
    },
    async () => runMcpTool(ctx, async () => mcpJsonResult(await executeGetUpcomingReminders(ctx))),
  );
}
