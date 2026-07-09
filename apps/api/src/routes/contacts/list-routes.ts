import { contactsListResponseSchema } from "@bondery/schemas";
import { peopleListQuerySchema } from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import type { AppFastifyInstance } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import { listContacts } from "../../services/contacts/queries.js";

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
}
