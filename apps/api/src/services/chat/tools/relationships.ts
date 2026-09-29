import type { DomainContext } from "../../../domains/_shared/context.js";
import {
  createRelationshipInputSchema,
  deleteRelationshipInputSchema,
  executeCreateRelationship,
  executeDeleteRelationship,
  executeGetRelationships,
  executeUpdateRelationship,
  getRelationshipsInputSchema,
  updateRelationshipInputSchema,
} from "../../assistant-tools/relationships.js";
import { chatTool } from "../chat-tool.js";

export function createRelationshipTools(ctx: DomainContext) {
  return {
    create_relationship: chatTool(ctx, {
      description: "Create a relationship between two contacts you own.",
      execute: (args) => executeCreateRelationship(ctx, args),
      inputSchema: createRelationshipInputSchema,
    }),
    delete_relationship: chatTool(ctx, {
      description:
        "Delete a relationship. Does not delete the people. Confirm with the user in the thread before calling.",
      execute: (args) => executeDeleteRelationship(ctx, args),
      inputSchema: deleteRelationshipInputSchema,
    }),
    get_relationships: chatTool(ctx, {
      description:
        "Get relationships for one contact that belongs to the signed-in user. At most 25.",
      execute: (args) => executeGetRelationships(ctx, args),
      inputSchema: getRelationshipsInputSchema,
    }),
    update_relationship: chatTool(ctx, {
      description: "Update a relationship that belongs to the signed-in user.",
      execute: (args) => executeUpdateRelationship(ctx, args),
      inputSchema: updateRelationshipInputSchema,
    }),
  };
}
