import { apiSuccessResponseSchema, contactSharePreviewResponseSchema } from "@bondery/schemas";
import type { McpServer } from "@modelcontextprotocol/server";
import type { JWTPayload } from "jose";
import type { DomainContext } from "../../../domains/_shared/context.js";
import {
  createContactShareInputSchema,
  executeCreateContactShare,
  executeGetContactShare,
  getContactShareInputSchema,
} from "../../../services/assistant-tools/share.js";
import { confirmMcpAction } from "./confirm-delete.js";
import { mcpJsonResult, runMcpTool } from "./json.js";
import { mcpToolMeta } from "./mcp-tool-meta.js";
import { runMcpWriteTool } from "./mcp-write.js";

export function registerShareMcpTools(
  server: McpServer,
  ctx: DomainContext,
  claims: JWTPayload,
): void {
  server.registerTool(
    "get_contact_share",
    {
      ...mcpToolMeta("get", "Preview contact share fields"),
      description:
        "Preview which fields can be included when emailing a contact card you own. Same payload as GET /contacts/:id/share-preview.",
      inputSchema: getContactShareInputSchema,
      outputSchema: contactSharePreviewResponseSchema,
    },
    async (args) =>
      runMcpTool(ctx, async () => mcpJsonResult(await executeGetContactShare(ctx, args))),
  );

  server.registerTool(
    "create_contact_share",
    {
      ...mcpToolMeta("create", "Email a contact card"),
      description:
        "Email a contact card you own after the host confirms. Outbound email cannot be undone. Requires mcp:write.",
      inputSchema: createContactShareInputSchema,
      outputSchema: apiSuccessResponseSchema,
    },
    async (input, extra) =>
      runMcpWriteTool(claims, ctx, async () => {
        const preview = await executeGetContactShare(ctx, { personId: input.personId });
        const recipients = input.recipientEmails.join(", ");
        const confirmArgs: Record<string, unknown> = {
          personId: input.personId,
          recipientEmails: input.recipientEmails,
          selectedFields: input.selectedFields,
        };
        if (input.message !== undefined) {
          confirmArgs.message = input.message;
        }
        return confirmMcpAction({
          args: confirmArgs,
          confirmDescription: "Confirm this email share",
          extra,
          onConfirm: async () => mcpJsonResult(await executeCreateContactShare(ctx, input)),
          preview: `Send a share email of ${preview.contactName} (${input.personId}) to ${recipients}? This cannot be undone.`,
          toolName: "create_contact_share",
          userId: ctx.user.id,
        });
      }),
  );
}
