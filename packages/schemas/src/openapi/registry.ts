import { z } from "zod";
import { contactIdSchema } from "../contact-id.js";
import { interactionSchema } from "../entities/activity.js";
import { apiErrorResponseSchema } from "../entities/api.js";
import {
  contactSchema,
  deleteContactResponseSchema,
  deleteContactsResponseSchema,
} from "../entities/contact.js";
import { groupSchema } from "../entities/group.js";
import { paginationMetaSchema } from "../entities/_shared.js";
import { tagSchema } from "../entities/tag.js";

/**
 * Registers shared schemas for OpenAPI component $refs.
 * Call once during API bootstrap before routes are registered.
 */
export function registerOpenApiComponentSchemas(): void {
  z.globalRegistry.add(contactSchema, {
    id: "Contact",
    description: "Contact read model",
  });
  z.globalRegistry.add(groupSchema, {
    id: "Group",
    description: "Group read model",
  });
  z.globalRegistry.add(tagSchema, {
    id: "Tag",
    description: "Tag read model",
  });
  z.globalRegistry.add(interactionSchema, {
    id: "Interaction",
    description: "Interaction read model",
  });
  z.globalRegistry.add(contactIdSchema, {
    id: "ContactId",
    description: "Contact person UUID",
  });
  z.globalRegistry.add(apiErrorResponseSchema, {
    id: "ApiError",
    description: "Error response with a human-readable message",
    example: { error: "Invalid request body" },
  });
  z.globalRegistry.add(paginationMetaSchema, {
    id: "PaginationMeta",
    description: "Pagination metadata",
  });
  z.globalRegistry.add(deleteContactsResponseSchema, {
    id: "DeleteContactsResponse",
    description: "Bulk contact delete result",
  });
  z.globalRegistry.add(deleteContactResponseSchema, {
    id: "DeleteContactResponse",
    description: "Single contact delete result",
  });
}
