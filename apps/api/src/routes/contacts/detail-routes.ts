import {
  contactGroupsResponseSchema,
  contactResponseSchema,
  createContactResponseSchema,
  deleteContactResponseSchema,
  updateContactInputSchema,
} from "@bondery/schemas";
import { avatarTransformQuerySchema, uuidParamSchema } from "@bondery/schemas/http";
import { syncConflictResponse } from "@bondery/schemas/http/responses";
import { EXAMPLE_VCARD_EXPORT } from "@bondery/schemas/openapi/fixtures/responses";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { deleteContact, updateContact } from "../../domains/contacts/index.js";
import { extractAvatarOptions } from "../../lib/data/select-fragments.js";
import { getAuth } from "../../lib/platform/auth/strategies.js";
import type { AppFastifyInstance } from "../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../lib/platform/openapi/responses.js";
import {
  getContact,
  getContactGroups,
  getContactVCardExport,
} from "../../services/contacts/queries.js";

export function registerContactDetailRoutes(fastify: AppFastifyInstance): void {
  fastify.get(
    "/:id",
    {
      schema: {
        description: "Get a single contact by ID.",
        params: uuidParamSchema,
        querystring: avatarTransformQuerySchema,
        response: withOkResponse(contactResponseSchema, "Contact details"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      const avatarOpts = extractAvatarOptions(request.query);
      return getContact(client, user.id, id, avatarOpts, request.log);
    },
  );

  fastify.patch(
    "/:id",
    {
      schema: {
        body: updateContactInputSchema,
        description: "Update a contact by ID.",
        params: uuidParamSchema,
        response: {
          ...withOkResponse(createContactResponseSchema, "Updated contact"),
          ...syncConflictResponse,
        },
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;
      const body = request.body;

      const { data, txid } = await updateContact(
        { client, log: request.log, user },
        {
          patch: body,
          personId: id,
        },
      );

      return { contact: data.contact, txid };
    },
  );

  fastify.delete(
    "/:id",
    {
      schema: {
        description: "Delete a single contact by ID.",
        params: uuidParamSchema,
        response: withOkResponse(deleteContactResponseSchema, "Contact deleted successfully"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client, user } = getAuth(request);
      const { id } = request.params;

      await deleteContact({ client, log: request.log, user }, id);
      return { message: "Contact deleted successfully" };
    },
  );

  fastify.get(
    "/:id/groups",
    {
      schema: {
        description: "List groups a contact belongs to.",
        params: uuidParamSchema,
        response: withOkResponse(contactGroupsResponseSchema, "Groups for the contact"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const { client } = getAuth(request);
      const { id: personId } = request.params;
      return getContactGroups(client, personId);
    },
  );

  fastify.get(
    "/:id/vcard",
    {
      schema: {
        description: "Export a contact as a vCard (.vcf) file.",
        params: uuidParamSchema,
        querystring: avatarTransformQuerySchema,
        response: withOkResponse(
          z.string().meta({ description: "vCard file content", example: EXAMPLE_VCARD_EXPORT }),
          "vCard export",
        ),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const avatarOpts = extractAvatarOptions(request.query);
      const { id } = request.params;

      const { vcard, filename } = await getContactVCardExport(
        client,
        user.id,
        id,
        avatarOpts,
        request.log,
      );

      reply.header("Content-Type", "text/vcard; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="${filename}"`);

      return vcard;
    },
  );
}
