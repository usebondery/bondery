import {
  contactRelationshipResponseSchema,
  contactRelationshipsResponseSchema,
  messageResponseSchema,
} from "@bondery/schemas";
import type { McpServer } from "@modelcontextprotocol/server";
import type { JWTPayload } from "jose";
import type { DomainContext } from "../../../domains/_shared/context.js";
import { domainDb } from "../../../domains/_shared/domain-db.js";
import { notFound } from "../../../lib/platform/errors/http-errors.js";
import {
  createRelationshipInputSchema,
  deleteRelationshipInputSchema,
  executeCreateRelationship,
  executeDeleteRelationship,
  executeGetRelationships,
  executeUpdateRelationship,
  getRelationshipsInputSchema,
  updateRelationshipInputSchema,
} from "../../../services/assistant-tools/relationships.js";
import { confirmMcpDelete } from "./confirm-delete.js";
import { mcpJsonResult, runMcpTool } from "./json.js";
import { mcpToolMeta } from "./mcp-tool-meta.js";
import { runMcpWriteTool } from "./mcp-write.js";

function personName(person: { firstName: string; lastName: string | null }) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ");
}

export function registerRelationshipMcpTools(
  server: McpServer,
  ctx: DomainContext,
  claims: JWTPayload,
): void {
  const db = domainDb(ctx);

  server.registerTool(
    "get_relationships",
    {
      ...mcpToolMeta("get", "Get relationships"),
      description:
        "Get relationships for one contact that belongs to the signed-in user. At most 25.",
      inputSchema: getRelationshipsInputSchema,
      outputSchema: contactRelationshipsResponseSchema,
    },
    async (args) =>
      runMcpTool(ctx, async () => mcpJsonResult(await executeGetRelationships(ctx, args))),
  );

  server.registerTool(
    "create_relationship",
    {
      ...mcpToolMeta("create", "Create a relationship"),
      description: "Create a relationship between two contacts you own. Requires mcp:write.",
      inputSchema: createRelationshipInputSchema,
      outputSchema: contactRelationshipResponseSchema,
    },
    async (args) =>
      runMcpWriteTool(claims, ctx, async () =>
        mcpJsonResult(await executeCreateRelationship(ctx, args)),
      ),
  );

  server.registerTool(
    "update_relationship",
    {
      ...mcpToolMeta("update", "Update a relationship"),
      description: "Update a relationship that belongs to the signed-in user. Requires mcp:write.",
      inputSchema: updateRelationshipInputSchema,
      outputSchema: contactRelationshipResponseSchema,
    },
    async (args) =>
      runMcpWriteTool(claims, ctx, async () =>
        mcpJsonResult(await executeUpdateRelationship(ctx, args)),
      ),
  );

  server.registerTool(
    "delete_relationship",
    {
      ...mcpToolMeta("delete", "Delete a relationship"),
      description:
        "Delete a relationship after the host confirms. Does not delete the people. Requires mcp:write.",
      inputSchema: deleteRelationshipInputSchema,
      outputSchema: messageResponseSchema,
    },
    async ({ personId, relationshipId }, extra) =>
      runMcpWriteTool(claims, ctx, async () => {
        const existing = await db.peopleRelationship.findFirst({
          select: {
            id: true,
            relationshipType: true,
            sourcePersonId: true,
            targetPersonId: true,
          },
          where: { id: relationshipId, userId: ctx.user.id },
        });
        if (
          !existing ||
          (existing.sourcePersonId !== personId && existing.targetPersonId !== personId)
        ) {
          throw notFound("Relationship not found", "relationship_not_found");
        }
        const peopleRows = await db.people.findMany({
          select: { firstName: true, id: true, lastName: true },
          where: {
            id: { in: [existing.sourcePersonId, existing.targetPersonId] },
            userId: ctx.user.id,
          },
        });
        const peopleById = new Map(peopleRows.map((row) => [row.id, row]));
        const source = peopleById.get(existing.sourcePersonId);
        const target = peopleById.get(existing.targetPersonId);
        const sourceName = source ? personName(source) : existing.sourcePersonId;
        const targetName = target ? personName(target) : existing.targetPersonId;
        return confirmMcpDelete({
          args: { personId, relationshipId },
          extra,
          onConfirm: async () =>
            mcpJsonResult(await executeDeleteRelationship(ctx, { personId, relationshipId })),
          preview: `Delete ${existing.relationshipType} relationship between ${sourceName} and ${targetName}? This does not delete the people.`,
          toolName: "delete_relationship",
          userId: ctx.user.id,
        });
      }),
  );
}
