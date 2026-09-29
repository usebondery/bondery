import {
  interactionResponseSchema,
  interactionsListResponseSchema,
  messageResponseSchema,
} from "@bondery/schemas";
import type { McpServer } from "@modelcontextprotocol/server";
import type { JWTPayload } from "jose";
import type { DomainContext } from "../../../domains/_shared/context.js";
import { domainDb } from "../../../domains/_shared/domain-db.js";
import { notFound } from "../../../lib/platform/errors/http-errors.js";
import {
  createInteractionInputSchema,
  deleteInteractionInputSchema,
  executeCreateInteraction,
  executeDeleteInteraction,
  executeGetInteraction,
  executeGetInteractions,
  executeUpdateInteraction,
  getInteractionInputSchema,
  getInteractionsInputSchema,
  updateInteractionInputSchema,
} from "../../../services/assistant-tools/interactions.js";
import { confirmMcpDelete } from "./confirm-delete.js";
import { mcpJsonResult, runMcpTool } from "./json.js";
import { mcpToolMeta } from "./mcp-tool-meta.js";
import { runMcpWriteTool } from "./mcp-write.js";

export function registerInteractionMcpTools(
  server: McpServer,
  ctx: DomainContext,
  claims: JWTPayload,
): void {
  const db = domainDb(ctx);

  server.registerTool(
    "create_interaction",
    {
      ...mcpToolMeta("create", "Create an interaction"),
      description:
        "Create an interaction with one or more contacts you own (participantIds, at most 25). Requires mcp:write.",
      inputSchema: createInteractionInputSchema,
      outputSchema: interactionResponseSchema,
    },
    async (args) =>
      runMcpWriteTool(claims, ctx, async () =>
        mcpJsonResult(await executeCreateInteraction(ctx, args)),
      ),
  );

  server.registerTool(
    "get_interactions",
    {
      ...mcpToolMeta("get", "Get interactions"),
      description:
        "Get interactions the signed-in user owns. Optional personId filters to one contact (like REST contactId). Offset paging; at most 25. Without personId, returns the most recent page.",
      inputSchema: getInteractionsInputSchema,
      outputSchema: interactionsListResponseSchema,
    },
    async (args) =>
      runMcpTool(ctx, async () => mcpJsonResult(await executeGetInteractions(ctx, args))),
  );

  server.registerTool(
    "get_interaction",
    {
      ...mcpToolMeta("get", "Get an interaction"),
      description: "Get one interaction that belongs to the signed-in user.",
      inputSchema: getInteractionInputSchema,
      outputSchema: interactionResponseSchema,
    },
    async (args) =>
      runMcpTool(ctx, async () => mcpJsonResult(await executeGetInteraction(ctx, args))),
  );

  server.registerTool(
    "update_interaction",
    {
      ...mcpToolMeta("update", "Update an interaction"),
      description:
        "Update an interaction you own. Optional participantIds replaces the full participant list (at most 25). Requires mcp:write.",
      inputSchema: updateInteractionInputSchema,
      outputSchema: interactionResponseSchema,
    },
    async (args) =>
      runMcpWriteTool(claims, ctx, async () =>
        mcpJsonResult(await executeUpdateInteraction(ctx, args)),
      ),
  );

  server.registerTool(
    "delete_interaction",
    {
      ...mcpToolMeta("delete", "Delete an interaction"),
      description: "Delete an interaction you own after the host confirms. Requires mcp:write.",
      inputSchema: deleteInteractionInputSchema,
      outputSchema: messageResponseSchema,
    },
    async ({ interactionId }, extra) =>
      runMcpWriteTool(claims, ctx, async () => {
        const existing = await db.interaction.findFirst({
          select: { date: true, id: true, title: true, type: true },
          where: { id: interactionId, userId: ctx.user.id },
        });
        if (!existing) {
          throw notFound("Interaction not found", "interaction_not_found");
        }
        const when = existing.date.toISOString().slice(0, 10);
        const label = existing.title || existing.type;
        return confirmMcpDelete({
          args: { interactionId },
          extra,
          onConfirm: async () =>
            mcpJsonResult(await executeDeleteInteraction(ctx, { interactionId })),
          preview: `Delete interaction ${label} on ${when} (${existing.id})? This cannot be undone.`,
          toolName: "delete_interaction",
          userId: ctx.user.id,
        });
      }),
  );
}
