import {
  addContactsToGroupResponseSchema,
  groupContactsListResponseSchema,
  groupResponseSchema,
  groupsListResponseSchema,
  messageResponseSchema,
  removeGroupMembersResponseSchema,
} from "@bondery/schemas";
import type { McpServer } from "@modelcontextprotocol/server";
import type { JWTPayload } from "jose";
import { assertOwnedPersonIds } from "../../../domains/_shared/assert-owned-person-ids.js";
import type { DomainContext } from "../../../domains/_shared/context.js";
import { domainDb } from "../../../domains/_shared/domain-db.js";
import { notFound } from "../../../lib/platform/errors/http-errors.js";
import {
  createGroupInputSchema,
  deleteGroupInputSchema,
  executeCreateGroup,
  executeCreateGroupMembership,
  executeDeleteGroup,
  executeDeleteGroupMembership,
  executeGetGroup,
  executeGetGroupContacts,
  executeGetGroups,
  executeSearchGroups,
  executeUpdateGroup,
  getGroupContactsInputSchema,
  getGroupInputSchema,
  getGroupsInputSchema,
  groupMembershipInputSchema,
  searchGroupsInputSchema,
  updateGroupInputSchema,
} from "../../../services/assistant-tools/groups.js";
import { confirmMcpDelete } from "./confirm-delete.js";
import { mcpJsonResult, runMcpTool } from "./json.js";
import { mcpToolMeta } from "./mcp-tool-meta.js";
import { runMcpWriteTool } from "./mcp-write.js";

export function registerGroupMcpTools(
  server: McpServer,
  ctx: DomainContext,
  claims: JWTPayload,
): void {
  const db = domainDb(ctx);

  server.registerTool(
    "search_groups",
    {
      ...mcpToolMeta("search", "Search groups"),
      description:
        "Search groups by label. Requires search so the full set is never dumped. At most 25 matches; offset paging.",
      inputSchema: searchGroupsInputSchema,
      outputSchema: groupsListResponseSchema,
    },
    async (args) =>
      runMcpTool(ctx, async () => mcpJsonResult(await executeSearchGroups(ctx, args))),
  );

  server.registerTool(
    "get_groups",
    {
      ...mcpToolMeta("get", "Browse groups"),
      description: "Browse groups that belong to the signed-in user. Offset paging; at most 25.",
      inputSchema: getGroupsInputSchema,
      outputSchema: groupsListResponseSchema,
    },
    async (args) => runMcpTool(ctx, async () => mcpJsonResult(await executeGetGroups(ctx, args))),
  );

  server.registerTool(
    "get_group",
    {
      ...mcpToolMeta("get", "Get a group"),
      description: "Get one group that belongs to the signed-in user.",
      inputSchema: getGroupInputSchema,
      outputSchema: groupResponseSchema,
    },
    async (args) => runMcpTool(ctx, async () => mcpJsonResult(await executeGetGroup(ctx, args))),
  );

  server.registerTool(
    "create_group",
    {
      ...mcpToolMeta("create", "Create a group"),
      description: "Create a group for organizing contacts. Requires mcp:write.",
      inputSchema: createGroupInputSchema,
      outputSchema: groupResponseSchema,
    },
    async (args) =>
      runMcpWriteTool(claims, ctx, async () => mcpJsonResult(await executeCreateGroup(ctx, args))),
  );

  server.registerTool(
    "update_group",
    {
      ...mcpToolMeta("update", "Update a group"),
      description: "Update a group that belongs to the signed-in user. Requires mcp:write.",
      inputSchema: updateGroupInputSchema,
      outputSchema: groupResponseSchema,
    },
    async (args) =>
      runMcpWriteTool(claims, ctx, async () => mcpJsonResult(await executeUpdateGroup(ctx, args))),
  );

  server.registerTool(
    "delete_group",
    {
      ...mcpToolMeta("delete", "Delete a group"),
      description:
        "Delete a group after the host confirms. Does not delete the people in it. Requires mcp:write.",
      inputSchema: deleteGroupInputSchema,
      outputSchema: messageResponseSchema,
    },
    async ({ groupId }, extra) =>
      runMcpWriteTool(claims, ctx, async () => {
        const group = await db.group.findFirst({
          select: { id: true, label: true },
          where: { id: groupId, userId: ctx.user.id },
        });
        if (!group) {
          throw notFound("Group not found", "group_not_found");
        }
        return confirmMcpDelete({
          args: { groupId },
          extra,
          onConfirm: async () => mcpJsonResult(await executeDeleteGroup(ctx, { groupId })),
          preview: `Delete group ${group.label} (${group.id})? This does not delete the people in it.`,
          toolName: "delete_group",
          userId: ctx.user.id,
        });
      }),
  );

  server.registerTool(
    "get_group_contacts",
    {
      ...mcpToolMeta("get", "Get group contacts"),
      description:
        "Get contacts in a group the signed-in user owns. Optional search; offset paging; at most 25.",
      inputSchema: getGroupContactsInputSchema,
      outputSchema: groupContactsListResponseSchema,
    },
    async (args) =>
      runMcpTool(ctx, async () => mcpJsonResult(await executeGetGroupContacts(ctx, args))),
  );

  server.registerTool(
    "create_group_membership",
    {
      ...mcpToolMeta("create", "Add to group"),
      description:
        "Add contacts you own to a group. Skips people who are already members. Requires mcp:write.",
      inputSchema: groupMembershipInputSchema,
      outputSchema: addContactsToGroupResponseSchema,
    },
    async (args) =>
      runMcpWriteTool(claims, ctx, async () =>
        mcpJsonResult(await executeCreateGroupMembership(ctx, args)),
      ),
  );

  server.registerTool(
    "delete_group_membership",
    {
      ...mcpToolMeta("delete", "Remove from group"),
      description:
        "Remove contacts from a group after the host confirms. Does not delete the people. Requires mcp:write.",
      inputSchema: groupMembershipInputSchema,
      outputSchema: removeGroupMembersResponseSchema,
    },
    async ({ groupId, personIds }, extra) =>
      runMcpWriteTool(claims, ctx, async () => {
        const group = await db.group.findFirst({
          select: { id: true, label: true },
          where: { id: groupId, userId: ctx.user.id },
        });
        if (!group) {
          throw notFound("Group not found", "group_not_found");
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
          args: { groupId, personIds },
          extra,
          onConfirm: async () =>
            mcpJsonResult(await executeDeleteGroupMembership(ctx, { groupId, personIds })),
          preview: `Remove ${names || `${uniquePersonIds.length} contact(s)`} from ${group.label}? This does not delete the people.`,
          toolName: "delete_group_membership",
          userId: ctx.user.id,
        });
      }),
  );
}
