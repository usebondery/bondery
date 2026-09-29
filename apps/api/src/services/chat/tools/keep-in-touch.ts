import type { DomainContext } from "../../../domains/_shared/context.js";
import {
  executeGetKeepInTouchContacts,
  executeGetKeepInTouchCount,
  executeUpdateKeepInTouch,
  getKeepInTouchContactsInputSchema,
  getKeepInTouchCountInputSchema,
  updateKeepInTouchInputSchema,
} from "../../assistant-tools/keep-in-touch.js";
import { chatTool } from "../chat-tool.js";

export function createKeepInTouchTools(ctx: DomainContext) {
  return {
    get_keep_in_touch_contacts: chatTool(ctx, {
      description:
        "Get contacts that have a keep-in-touch cadence. Optional search; offset paging; at most 25.",
      execute: (args) => executeGetKeepInTouchContacts(ctx, args),
      inputSchema: getKeepInTouchContactsInputSchema,
    }),
    get_keep_in_touch_count: chatTool(ctx, {
      description: "Get how many keep-in-touch contacts are overdue for the signed-in user.",
      execute: () => executeGetKeepInTouchCount(ctx),
      inputSchema: getKeepInTouchCountInputSchema,
    }),
    update_keep_in_touch: chatTool(ctx, {
      description: "Set or clear a contact's keep-in-touch cadence and/or last interaction.",
      execute: (args) => executeUpdateKeepInTouch(ctx, args),
      inputSchema: updateKeepInTouchInputSchema,
    }),
  };
}
