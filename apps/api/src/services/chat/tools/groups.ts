import type { DomainContext } from "../../../domains/_shared/context.js";
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
} from "../../assistant-tools/groups.js";
import { chatTool } from "../chat-tool.js";

export function createGroupTools(ctx: DomainContext) {
  return {
    create_group: chatTool(ctx, {
      description: "Create a group for organizing contacts.",
      execute: (args) => executeCreateGroup(ctx, args),
      inputSchema: createGroupInputSchema,
    }),
    create_group_membership: chatTool(ctx, {
      description: "Add contacts you own to a group. Skips people who are already members.",
      execute: (args) => executeCreateGroupMembership(ctx, args),
      inputSchema: groupMembershipInputSchema,
    }),
    delete_group: chatTool(ctx, {
      description:
        "Delete a group. Does not delete the people in it. Confirm with the user in the thread before calling.",
      execute: (args) => executeDeleteGroup(ctx, args),
      inputSchema: deleteGroupInputSchema,
    }),
    delete_group_membership: chatTool(ctx, {
      description:
        "Remove contacts from a group. Does not delete the people. Confirm with the user in the thread before calling.",
      execute: (args) => executeDeleteGroupMembership(ctx, args),
      inputSchema: groupMembershipInputSchema,
    }),
    get_group: chatTool(ctx, {
      description: "Get one group that belongs to the signed-in user.",
      execute: (args) => executeGetGroup(ctx, args),
      inputSchema: getGroupInputSchema,
    }),
    get_group_contacts: chatTool(ctx, {
      description:
        "Get contacts in a group the signed-in user owns. Optional search; offset paging; at most 25.",
      execute: (args) => executeGetGroupContacts(ctx, args),
      inputSchema: getGroupContactsInputSchema,
    }),
    get_groups: chatTool(ctx, {
      description: "Browse groups that belong to the signed-in user. Offset paging; at most 25.",
      execute: (args) => executeGetGroups(ctx, args),
      inputSchema: getGroupsInputSchema,
    }),
    search_groups: chatTool(ctx, {
      description:
        "Search groups by label. Requires search so the full set is never dumped. At most 25 matches.",
      execute: (args) => executeSearchGroups(ctx, args),
      inputSchema: searchGroupsInputSchema,
    }),
    update_group: chatTool(ctx, {
      description: "Update a group that belongs to the signed-in user.",
      execute: (args) => executeUpdateGroup(ctx, args),
      inputSchema: updateGroupInputSchema,
    }),
  };
}
