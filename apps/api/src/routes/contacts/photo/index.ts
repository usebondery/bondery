/**
 * Contact photo upload and delete routes
 */

import { apiSuccessResponseSchema, photoUploadResponseSchema } from "@bondery/schemas";
import { uuidParamSchema } from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { deleteContactPhoto, uploadContactPhoto } from "../../../domains/contacts/photo.js";
import { badRequest } from "../../../lib/platform/errors/http-errors.js";
import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";

export function registerPhotoRoutes(fastify: AppFastifyInstance): void {
  fastify.post(
    "/:id/photo",
    {
      schema: {
        description: "Upload a contact photo.",
        params: uuidParamSchema,
        response: withOkResponse(photoUploadResponseSchema, "Photo uploaded"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request, _reply) => {
      const { id: contactId } = request.params;
      const data = await request.file();
      if (!data) {
        throw badRequest("No file provided", "bad_request");
      }

      const { validateImageUpload, validateImageMagicBytes } = await import(
        "../../../lib/platform/config.js"
      );
      const validation = validateImageUpload({ size: 0, type: data.mimetype });
      if (!validation.isValid) {
        throw badRequest(validation.error ?? "Invalid upload", "validation_error");
      }

      const buffer = await data.toBuffer();
      if (!validateImageMagicBytes(buffer)) {
        throw badRequest("File content does not match a valid image format", "validation_error");
      }

      const { data: result } = await uploadContactPhoto(ctx, contactId, buffer, data.mimetype);
      return result;
    }),
  );

  fastify.delete(
    "/:id/photo",
    {
      schema: {
        description: "Delete a contact photo.",
        params: uuidParamSchema,
        response: withOkResponse(apiSuccessResponseSchema, "Photo deleted"),
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute(async (ctx, request) => {
      const { id: contactId } = request.params;
      const { data } = await deleteContactPhoto(ctx, contactId);
      return data;
    }),
  );
}
