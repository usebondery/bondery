import { z } from "zod";
import { contactIdSchema } from "#contact-id/index.js";
import { paginationMetaSchema } from "#entities/_shared/index.js";
import { interactionSchema } from "#entities/activity/index.js";
import {
  contactSchema,
  deleteContactResponseSchema,
  deleteContactsResponseSchema,
} from "#entities/contact/index.js";
import { groupSchema } from "#entities/group/index.js";
import { tagSchema } from "#entities/tag/index.js";
import { apiErrorResponseSchema } from "#errors/api-error-response/index.js";
import {
  EXAMPLE_CONTACT,
  EXAMPLE_GROUP,
  EXAMPLE_INTERACTION,
  EXAMPLE_TAG,
} from "#openapi/fixtures/entities.js";
import { EXAMPLE_ERROR_400, EXAMPLE_SYNC_CONFLICT_ERROR } from "#openapi/fixtures/errors.js";
import { EXAMPLE_PAGINATION } from "#openapi/fixtures/primitives.js";
import {
  EXAMPLE_DELETE_CONTACT_RESPONSE,
  EXAMPLE_DELETE_CONTACTS_RESPONSE,
} from "#openapi/fixtures/responses.js";
import { syncConflictErrorResponseSchema } from "#sync/conflict/index.js";

/**
 * Registers shared schemas for OpenAPI component $refs.
 * Call once during API bootstrap before routes are registered.
 */
export function registerOpenApiComponentSchemas(): void {
  z.globalRegistry.add(contactSchema, {
    description: "Contact read model",
    example: EXAMPLE_CONTACT,
    id: "Contact",
  });
  z.globalRegistry.add(groupSchema, {
    description: "Group read model",
    example: EXAMPLE_GROUP,
    id: "Group",
  });
  z.globalRegistry.add(tagSchema, {
    description: "Tag read model",
    example: EXAMPLE_TAG,
    id: "Tag",
  });
  z.globalRegistry.add(interactionSchema, {
    description: "Interaction read model",
    example: EXAMPLE_INTERACTION,
    id: "Interaction",
  });
  z.globalRegistry.add(contactIdSchema, {
    description: "Contact person UUID",
    id: "ContactId",
  });
  z.globalRegistry.add(apiErrorResponseSchema, {
    description: "Error response with a human-readable message",
    example: EXAMPLE_ERROR_400,
    id: "ApiError",
  });
  z.globalRegistry.add(syncConflictErrorResponseSchema, {
    description: "Contact update conflict with the current server version",
    example: EXAMPLE_SYNC_CONFLICT_ERROR,
    id: "SyncConflictError",
  });
  z.globalRegistry.add(paginationMetaSchema, {
    description: "Pagination metadata",
    example: EXAMPLE_PAGINATION,
    id: "PaginationMeta",
  });
  z.globalRegistry.add(deleteContactsResponseSchema, {
    description: "Bulk contact delete result",
    example: EXAMPLE_DELETE_CONTACTS_RESPONSE,
    id: "DeleteContactsResponse",
  });
  z.globalRegistry.add(deleteContactResponseSchema, {
    description: "Single contact delete result",
    example: EXAMPLE_DELETE_CONTACT_RESPONSE,
    id: "DeleteContactResponse",
  });
}
