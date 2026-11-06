import { contactsListResponseSchema, contactsSelectableListResponseSchema } from "@bondery/schemas";
import { peopleListQuerySchema } from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { domainContextFromRequest } from "../../lib/platform/domain-context.js";
import type { AppFastifyInstance } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { listContacts, listSelectableContacts } from "../../services/contacts/queries.js";

export function registerContactListRoutes(fastify: AppFastifyInstance): void {
  fastify.get(
    "/",
    {
      schema: {
        description: "List contacts with pagination, search, sort, and list stats.",
        querystring: peopleListQuerySchema,
        response: withOkResponse(contactsListResponseSchema, "Paginated contact list"),
        summary: "List contacts",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const ctx = domainContextFromRequest(request);
      return listContacts(ctx, request.query);
    },
  );

  fastify.get(
    "/select",
    {
      schema: {
        description:
          "List contacts for pickers and comboboxes (identity fields only, no channel enrichment).",
        querystring: peopleListQuerySchema,
        response: withOkResponse(
          contactsSelectableListResponseSchema,
          "Paginated selectable contact list",
        ),
        summary: "List contacts for pickers",
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const ctx = domainContextFromRequest(request);
      return listSelectableContacts(ctx, request.query);
    },
  );
}
