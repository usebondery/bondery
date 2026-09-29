import {
  contactGroupsResponseSchema,
  contactResponseSchema,
  contactSharePreviewResponseSchema,
  createContactResponseSchema,
  deleteContactResponseSchema,
  updateContactInputSchema,
} from "@bondery/schemas";
import { avatarTransformQuerySchema, uuidParamSchema } from "@bondery/schemas/http";
import { syncConflictResponse } from "@bondery/schemas/http/responses";
import { EXAMPLE_VCARD_EXPORT } from "@bondery/schemas/openapi/fixtures/responses";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { z } from "zod";
import { domainDb } from "../../domains/_shared/domain-db.js";
import {
  deleteContact,
  getContactSharingPreview,
  updateContact,
} from "../../domains/contacts/index.js";
import { extractAvatarOptions } from "../../lib/data/select-fragments.js";
import { domainContextFromRequest } from "../../lib/platform/domain-context.js";
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
      const ctx = domainContextFromRequest(request);
      const { id } = request.params;
      const avatarOpts = extractAvatarOptions(request.query);
      return getContact(ctx, id, avatarOpts);
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
      const ctx = domainContextFromRequest(request);
      const { id } = request.params;
      const body = request.body;

      const { data, txid } = await updateContact(ctx, {
        patch: body,
        personId: id,
      });

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
      const ctx = domainContextFromRequest(request);
      const { id } = request.params;

      await deleteContact(ctx, id);
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
      const ctx = domainContextFromRequest(request);
      const { id: personId } = request.params;
      return getContactGroups(domainDb(ctx), ctx.user.id, personId);
    },
  );

  fastify.get(
    "/:id/share-preview",
    {
      schema: {
        description: "Preview which fields can be included when sharing a contact by email.",
        params: uuidParamSchema,
        response: withOkResponse(contactSharePreviewResponseSchema, "Shareable contact fields"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request) => {
      const ctx = domainContextFromRequest(request);
      return getContactSharingPreview(ctx, request.params.id);
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
      const ctx = domainContextFromRequest(request);
      const avatarOpts = extractAvatarOptions(request.query);
      const { id } = request.params;

      const { vcard, filename } = await getContactVCardExport(ctx, id, avatarOpts);

      reply.header("Content-Type", "text/vcard; charset=utf-8");
      reply.header("Content-Disposition", `attachment; filename="${filename}"`);

      return vcard;
    },
  );
}
