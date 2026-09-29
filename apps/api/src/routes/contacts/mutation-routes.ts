import {
  createContactBodySchema,
  createContactResponseSchema,
  deleteContactsRequestSchema,
  deleteContactsResponseSchema,
} from "@bondery/schemas";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { createContact, deleteContacts } from "../../domains/contacts/index.js";
import { resolveContactPersonIds } from "../../lib/contacts/resolve-person-ids.js";
import { domainContextFromRequest } from "../../lib/platform/domain-context.js";
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
        description:
          "Create a new contact. Optional phones, emails, socials, notes, and profile fields.",
        response: withCreatedResponse(createContactResponseSchema, "Contact created"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const ctx = domainContextFromRequest(request);
      const body = request.body;

      const { data, txid } = await createContact(ctx, body);

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
    withDomainRoute({ body: deleteContactsRequestSchema }, async (ctx, { body }) => {
      const { user } = ctx;
      const db = domainDb(ctx);

      let uniqueIds: string[];

      if ("ids" in body && Array.isArray(body.ids)) {
        uniqueIds = await resolveContactPersonIds(
          db,
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
        uniqueIds = await resolveContactPersonIds(db, user.id, {
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
