import type { DomainContext } from "../../../domains/_shared/context.js";
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
} from "../../assistant-tools/interactions.js";
import { chatTool } from "../chat-tool.js";

export function createInteractionTools(ctx: DomainContext) {
  return {
    create_interaction: chatTool(ctx, {
      description:
        "Create an interaction with contacts you own (participantIds, at most 25). Infers type from the user's wording when they do not name one.",
      execute: (args) => executeCreateInteraction(ctx, args),
      inputSchema: createInteractionInputSchema,
    }),
    delete_interaction: chatTool(ctx, {
      description:
        "Delete an interaction you own. Confirm with the user in the thread before calling.",
      execute: (args) => executeDeleteInteraction(ctx, args),
      inputSchema: deleteInteractionInputSchema,
    }),
    get_interaction: chatTool(ctx, {
      description: "Get one interaction that belongs to the signed-in user.",
      execute: (args) => executeGetInteraction(ctx, args),
      inputSchema: getInteractionInputSchema,
    }),
    get_interactions: chatTool(ctx, {
      description:
        "Get interactions the signed-in user owns. Optional personId filters to one contact. Offset paging; at most 25.",
      execute: (args) => executeGetInteractions(ctx, args),
      inputSchema: getInteractionsInputSchema,
    }),
    update_interaction: chatTool(ctx, {
      description:
        "Update an interaction you own. Optional participantIds replaces the full participant list (at most 25). Use this to add or remove people from an existing event.",
      execute: (args) => executeUpdateInteraction(ctx, args),
      inputSchema: updateInteractionInputSchema,
    }),
  };
}
