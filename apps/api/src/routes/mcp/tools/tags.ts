import {
  addContactsToTagResponseSchema,
  messageResponseSchema,
  removeContactsFromTagResponseSchema,
  tagMembersListResponseSchema,
  tagResponseSchema,
  tagsListResponseSchema,
  tagUpdateResponseSchema,
} from "@bondery/schemas";
import type { McpServer } from "@modelcontextprotocol/server";
import type { JWTPayload } from "jose";
import { assertOwnedPersonIds } from "../../../domains/_shared/assert-owned-person-ids.js";
import type { DomainContext } from "../../../domains/_shared/context.js";
import { domainDb } from "../../../domains/_shared/domain-db.js";
import { notFound } from "../../../lib/platform/errors/http-errors.js";
import {
  createTagInputSchema,
  deleteTagInputSchema,
  deleteTagsInputSchema,
  executeCreateTag,
  executeCreateTagMembership,
  executeDeleteTag,
  executeDeleteTagMembership,
  executeDeleteTags,
  executeGetTag,
  executeGetTagContacts,
  executeGetTags,
  executeSearchTags,
  executeUpdateTag,
  getTagContactsInputSchema,
  getTagInputSchema,
  getTagsInputSchema,
  searchTagsInputSchema,
  tagMembershipInputSchema,
  updateTagInputSchema,
} from "../../../services/assistant-tools/tags.js";
import { confirmMcpDelete } from "./confirm-delete.js";
import { mcpJsonResult, runMcpTool } from "./json.js";
import { mcpToolMeta } from "./mcp-tool-meta.js";
import { runMcpWriteTool } from "./mcp-write.js";

export function registerTagMcpTools(
  server: McpServer,
  ctx: DomainContext,
  claims: JWTPayload,
): void {
  const db = domainDb(ctx);

  server.registerTool(
    "search_tags",
    {
      ...mcpToolMeta("search", "Search tags"),
      description:
        "Search tags by label. Requires search so the full set is never dumped. At most 25 matches; offset paging.",
      inputSchema: searchTagsInputSchema,
      outputSchema: tagsListResponseSchema,
    },
    async (args) => runMcpTool(ctx, async () => mcpJsonResult(await executeSearchTags(ctx, args))),
  );

  server.registerTool(
    "get_tags",
    {
      ...mcpToolMeta("get", "Browse tags"),
      description: "Browse tags that belong to the signed-in user. Offset paging; at most 25.",
      inputSchema: getTagsInputSchema,
      outputSchema: tagsListResponseSchema,
    },
    async (args) => runMcpTool(ctx, async () => mcpJsonResult(await executeGetTags(ctx, args))),
  );

  server.registerTool(
    "get_tag",
    {
      ...mcpToolMeta("get", "Get a tag"),
      description: "Get one tag that belongs to the signed-in user.",
      inputSchema: getTagInputSchema,
      outputSchema: tagResponseSchema,
    },
    async (args) => runMcpTool(ctx, async () => mcpJsonResult(await executeGetTag(ctx, args))),
  );

  server.registerTool(
    "create_tag",
    {
      ...mcpToolMeta("create", "Create a tag"),
      description: "Create a tag. A color is assigned automatically. Requires mcp:write.",
      inputSchema: createTagInputSchema,
      outputSchema: tagResponseSchema,
    },
    async (args) =>
      runMcpWriteTool(claims, ctx, async () => mcpJsonResult(await executeCreateTag(ctx, args))),
  );

  server.registerTool(
    "update_tag",
    {
      ...mcpToolMeta("update", "Update a tag"),
      description: "Update a tag that belongs to the signed-in user. Requires mcp:write.",
      inputSchema: updateTagInputSchema,
      outputSchema: tagUpdateResponseSchema,
    },
    async (args) =>
      runMcpWriteTool(claims, ctx, async () => mcpJsonResult(await executeUpdateTag(ctx, args))),
  );

  server.registerTool(
    "delete_tag",
    {
      ...mcpToolMeta("delete", "Delete a tag"),
      description:
        "Delete a tag after the host confirms. Does not delete the people who had it. Requires mcp:write.",
      inputSchema: deleteTagInputSchema,
      outputSchema: messageResponseSchema,
    },
    async ({ tagId }, extra) =>
      runMcpWriteTool(claims, ctx, async () => {
        const tag = await db.tag.findFirst({
          select: { id: true, label: true },
          where: { id: tagId, userId: ctx.user.id },
        });
        if (!tag) {
          throw notFound("Tag not found", "tag_not_found");
        }
        return confirmMcpDelete({
          args: { tagId },
          extra,
          onConfirm: async () => mcpJsonResult(await executeDeleteTag(ctx, { tagId })),
          preview: `Delete tag ${tag.label} (${tag.id})? This does not delete the people who had it.`,
          toolName: "delete_tag",
          userId: ctx.user.id,
        });
      }),
  );

  server.registerTool(
    "delete_tags",
    {
      ...mcpToolMeta("delete", "Delete tags"),
      description:
        "Delete up to 25 tags after the host confirms. Does not delete the people who had them. Fails if any id is missing. Requires mcp:write.",
      inputSchema: deleteTagsInputSchema,
      outputSchema: messageResponseSchema,
    },
    async ({ tagIds }, extra) =>
      runMcpWriteTool(claims, ctx, async () => {
        const uniqueIds = [...new Set(tagIds)];
        const tags = await db.tag.findMany({
          select: { id: true, label: true },
          where: { id: { in: uniqueIds }, userId: ctx.user.id },
        });
        if (tags.length !== uniqueIds.length) {
          throw notFound("Tag not found", "tag_not_found");
        }
        const labelById = new Map(tags.map((tag) => [tag.id, tag.label]));
        const labels = uniqueIds.map((id) => labelById.get(id) ?? id);
        const listed =
          labels.length <= 3 ? labels.join(", ") : `${labels.slice(0, 3).join(", ")}, …`;
        const countLabel = labels.length === 1 ? "tag" : `${labels.length} tags`;
        return confirmMcpDelete({
          args: { tagIds },
          extra,
          onConfirm: async () => mcpJsonResult(await executeDeleteTags(ctx, { tagIds })),
          preview: `Delete ${countLabel} ${listed}? This does not delete the people who had them.`,
          toolName: "delete_tags",
          userId: ctx.user.id,
        });
      }),
  );

  server.registerTool(
    "get_tag_contacts",
    {
      ...mcpToolMeta("get", "Get tagged contacts"),
      description:
        "Get contacts with a tag the signed-in user owns. Optional search; offset paging; at most 25.",
      inputSchema: getTagContactsInputSchema,
      outputSchema: tagMembersListResponseSchema,
    },
    async (args) =>
      runMcpTool(ctx, async () => mcpJsonResult(await executeGetTagContacts(ctx, args))),
  );

  server.registerTool(
    "create_tag_membership",
    {
      ...mcpToolMeta("create", "Add a tag"),
      description:
        "Add a tag to contacts you own. Skips people who already have it. Requires mcp:write.",
      inputSchema: tagMembershipInputSchema,
      outputSchema: addContactsToTagResponseSchema,
    },
    async (args) =>
      runMcpWriteTool(claims, ctx, async () =>
        mcpJsonResult(await executeCreateTagMembership(ctx, args)),
      ),
  );

  server.registerTool(
    "delete_tag_membership",
    {
      ...mcpToolMeta("delete", "Remove a tag"),
      description:
        "Remove a tag from contacts after the host confirms. Does not delete the people or the tag. Requires mcp:write.",
      inputSchema: tagMembershipInputSchema,
      outputSchema: removeContactsFromTagResponseSchema,
    },
    async ({ tagId, personIds }, extra) =>
      runMcpWriteTool(claims, ctx, async () => {
        const tag = await db.tag.findFirst({
          select: { id: true, label: true },
          where: { id: tagId, userId: ctx.user.id },
        });
        if (!tag) {
          throw notFound("Tag not found", "tag_not_found");
        }
        const uniquePersonIds = [...new Set(personIds)];
        await assertOwnedPersonIds(ctx, uniquePersonIds);
        const members = await db.people.findMany({
          select: { firstName: true, lastName: true },
          where: { id: { in: uniquePersonIds }, userId: ctx.user.id },
        });
        const names = members
          .map((person) => [person.firstName, person.lastName].filter(Boolean).join(" "))
          .filter(Boolean)
          .join(", ");
        return confirmMcpDelete({
          args: { personIds, tagId },
          extra,
          onConfirm: async () =>
            mcpJsonResult(await executeDeleteTagMembership(ctx, { personIds, tagId })),
          preview: `Remove tag ${tag.label} from ${names || `${uniquePersonIds.length} contact(s)`}? This does not delete the people or the tag.`,
          toolName: "delete_tag_membership",
          userId: ctx.user.id,
        });
      }),
  );
}
