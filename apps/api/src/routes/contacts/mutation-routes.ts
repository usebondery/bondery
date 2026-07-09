import {
  createContactBodySchema,
  createContactResponseSchema,
  deleteContactsRequestSchema,
  deleteContactsResponseSchema,
} from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { createContact, deleteContacts } from "../../domains/contacts/index.js";
import { resolveContactPersonIds } from "../../lib/contacts/resolve-person-ids.js";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import { badRequest } from "../../lib/platform/errors/http-errors.js";
import type { AppFastifyInstance } from "../../lib/platform/fastify-types.js";
import { withCreatedResponse, withOkResponse } from "../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../lib/platform/with-domain-route.js";

export function registerContactMutationRoutes(fastify: AppFastifyInstance): void {
  fastify.post(
    "/",
    {
      schema: {
        body: createContactBodySchema,
        description: "Create a new contact.",
        response: withCreatedResponse(createContactResponseSchema, "Contact created"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const body = request.body;

      const { data, txid } = await createContact(
        { client, log: request.log, user },
        {
          firstName: body.firstName,
          id: body.id,
          lastName: body.lastName,
          linkedin: body.linkedin,
          middleName: body.middleName,
        },
      );

      return reply.status(201).send({ contact: data.contact, txid });
    },
  );

  fastify.delete(
    "/",
    {
      schema: {
        body: deleteContactsRequestSchema,
        description: "Delete multiple contacts by IDs or by filter with optional exclusions.",
        response: withOkResponse(deleteContactsResponseSchema, "Contacts deleted successfully"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request) => {
      const body = request.body;
      const { client, user } = ctx;

      let uniqueIds: string[];

      if ("ids" in body && Array.isArray(body.ids)) {
        uniqueIds = await resolveContactPersonIds(
          client,
          user.id,
          { personIds: body.ids },
          {
            emptyExplicitError: "Invalid request body. 'ids' must be a non-empty array.",
            onlyMyselfError:
              "No deletable contacts found. Your own contact card cannot be deleted.",
            rejectEmptyExplicit: true,
          },
        );
      } else if ("filter" in body && body.filter) {
        uniqueIds = await resolveContactPersonIds(client, user.id, {
          contactFilter: body.filter,
          excludePersonIds: body.excludeIds,
        });

        if (uniqueIds.length === 0) {
          return { message: "No contacts matched the filter" };
        }
      } else {
        throw badRequest(
          "Invalid request body. Provide either 'ids' or 'filter'.",
          "contact_delete_invalid_body",
        );
      }

      const { data } = await deleteContacts(ctx, uniqueIds);

      return {
        deletedCount: data.deletedCount,
        message: "Contacts deleted successfully",
      };
    }),
  );
}
