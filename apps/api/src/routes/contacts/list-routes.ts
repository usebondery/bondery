import { contactsListResponseSchema, contactsSelectableListResponseSchema } from "@bondery/schemas";
import { peopleListQuerySchema } from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getAuth } from "../../lib/platform/auth/strategies.js";
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
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      return listContacts(client, user.id, request.query, request.log);
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
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      return listSelectableContacts(client, user.id, request.query, request.log);
    },
  );
}
