import type { DomainContext } from "../../../domains/_shared/context.js";
import {
  createTagInputSchema,
  deleteTagInputSchema,
  executeCreateTag,
  executeCreateTagMembership,
  executeDeleteTag,
  executeDeleteTagMembership,
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
} from "../../assistant-tools/tags.js";
import { chatTool } from "../chat-tool.js";

export function createTagTools(ctx: DomainContext) {
  return {
    create_tag: chatTool(ctx, {
      description: "Create a tag. A color is assigned automatically.",
      execute: (args) => executeCreateTag(ctx, args),
      inputSchema: createTagInputSchema,
    }),
    create_tag_membership: chatTool(ctx, {
      description: "Add a tag to contacts you own. Skips people who already have it.",
      execute: (args) => executeCreateTagMembership(ctx, args),
      inputSchema: tagMembershipInputSchema,
    }),
    delete_tag: chatTool(ctx, {
      description:
        "Delete a tag. Does not delete the people who had it. Confirm with the user in the thread before calling.",
      execute: (args) => executeDeleteTag(ctx, args),
      inputSchema: deleteTagInputSchema,
    }),
    delete_tag_membership: chatTool(ctx, {
      description:
        "Remove a tag from contacts. Does not delete the people or the tag. Confirm with the user in the thread before calling.",
      execute: (args) => executeDeleteTagMembership(ctx, args),
      inputSchema: tagMembershipInputSchema,
    }),
    get_tag: chatTool(ctx, {
      description: "Get one tag that belongs to the signed-in user.",
      execute: (args) => executeGetTag(ctx, args),
      inputSchema: getTagInputSchema,
    }),
    get_tag_contacts: chatTool(ctx, {
      description:
        "Get contacts with a tag the signed-in user owns. Optional search; offset paging; at most 25.",
      execute: (args) => executeGetTagContacts(ctx, args),
      inputSchema: getTagContactsInputSchema,
    }),
    get_tags: chatTool(ctx, {
      description: "Browse tags that belong to the signed-in user. Offset paging; at most 25.",
      execute: (args) => executeGetTags(ctx, args),
      inputSchema: getTagsInputSchema,
    }),
    search_tags: chatTool(ctx, {
      description:
        "Search tags by label. Requires search so the full set is never dumped. At most 25 matches.",
      execute: (args) => executeSearchTags(ctx, args),
      inputSchema: searchTagsInputSchema,
    }),
    update_tag: chatTool(ctx, {
      description: "Update a tag that belongs to the signed-in user.",
      execute: (args) => executeUpdateTag(ctx, args),
      inputSchema: updateTagInputSchema,
    }),
  };
}
