import type { DomainContext } from "../../../domains/_shared/context.js";
import {
  createContactShareInputSchema,
  executeCreateContactShare,
  executeGetContactShare,
  getContactShareInputSchema,
} from "../../assistant-tools/share.js";
import { chatTool } from "../chat-tool.js";

export function createShareTools(ctx: DomainContext) {
  return {
    create_contact_share: chatTool(ctx, {
      description:
        "Email a contact card you own. Outbound email cannot be undone. Confirm recipients and fields with the user in the thread before calling. Do not call this in the webapp — emit [[bp:action:share-contact|UUID]] instead.",
      execute: (args) => executeCreateContactShare(ctx, args),
      inputSchema: createContactShareInputSchema,
    }),
    get_contact_share: chatTool(ctx, {
      description:
        "Preview which fields can be included when emailing a contact card you own. Do not call this in the webapp — emit [[bp:action:share-contact|UUID]] instead.",
      execute: (args) => executeGetContactShare(ctx, args),
      inputSchema: getContactShareInputSchema,
    }),
  };
}
