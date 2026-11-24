/**
 * Contact photo upload and delete routes
 */

import { apiSuccessResponseSchema, photoUploadResponseSchema } from "@bondery/schemas";
import { uuidParamSchema } from "@bondery/schemas/http";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { deleteContactPhoto, uploadContactPhoto } from "../../../domains/contacts/photo.js";
import {
  AVATAR_UPLOAD,
  UPLOAD_LIMITS,
  validateImageMagicBytes,
  validateImageUpload,
} from "../../../lib/platform/config.js";
import { badRequest } from "../../../lib/platform/errors/http-errors.js";
import type { AppFastifyInstance } from "../../../lib/platform/fastify-types.js";
import { withOkResponse } from "../../../lib/platform/openapi/responses.js";
import { readUploadedFile } from "../../../lib/platform/uploads.js";
import { withDomainRoute } from "../../../lib/platform/with-domain-route.js";

export function registerPhotoRoutes(fastify: AppFastifyInstance): void {
  fastify.post(
    "/:id/photo",
    {
      schema: {
        description: "Upload a contact photo.",
        params: uuidParamSchema,
        response: withOkResponse(photoUploadResponseSchema, "Photo uploaded"),
        summary: "Upload a contact photo",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ params: uuidParamSchema }, async (ctx, { params, request }, _reply) => {
      const contactId = params.id;
      // The cap applies while the body streams: a 100 MB upload is cut off at the limit, not
      // buffered and checked afterwards.
      const file = await readUploadedFile(request, {
        allowedMimeTypes: AVATAR_UPLOAD.allowedMimeTypes,
        maxBytes: UPLOAD_LIMITS.image,
      });
      if (!file) {
        throw badRequest("No file provided", "bad_request");
      }

      // Re-check the buffered size with the same validator the profile photo uses, so the cap
      // holds even if the streaming limit is ever loosened.
      const validation = validateImageUpload({ size: file.buffer.length, type: file.mimetype });
      if (!validation.isValid) {
        throw badRequest(validation.error ?? "Invalid upload", "validation_error");
      }
      if (!validateImageMagicBytes(file.buffer)) {
        throw badRequest("File content does not match a valid image format", "validation_error");
      }

      const { data: result } = await uploadContactPhoto(ctx, contactId, file.buffer, file.mimetype);
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
        summary: "Delete a contact photo",
      } satisfies FastifyZodOpenApiSchema,
    },
    withDomainRoute({ params: uuidParamSchema }, async (ctx, { params }) => {
      const { data } = await deleteContactPhoto(ctx, params.id);
      return data;
    }),
  );
}
