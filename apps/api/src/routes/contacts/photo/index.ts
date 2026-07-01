/**
 * Contact photo upload and delete routes
 */

import type { FastifyInstance, FastifyReply } from "fastify";
import type { AppFastifyInstance } from "../../../lib/fastify-types.js";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getAuth } from "../../../lib/auth.js";
import { withOkResponse } from "../../../lib/openapi-route-responses.js";
import {
  apiSuccessResponseSchema,
  photoUploadResponseSchema,
} from "@bondery/schemas";
import {
  uploadContactAvatarAndSetFlag,
  deleteContactAvatarAndClearFlag,
} from "../../../lib/avatar-storage.js";
import { createAdminClient, resolveContactAvatarUrl } from "../../../lib/supabase.js";
import { uuidParamSchema } from "@bondery/schemas/http";

export function registerPhotoRoutes(fastify: AppFastifyInstance): void {
  /**
   * POST /api/contacts/:id/photo - Upload contact photo
   */
  fastify.post(
    "/:id/photo",
    {
      schema: {
        description: "Upload a contact photo.",
        params: uuidParamSchema,
        response: withOkResponse(photoUploadResponseSchema, "Photo uploaded"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id: contactId } = request.params;

      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: "No file provided" });
      }

      const { validateImageUpload, validateImageMagicBytes } =
        await import("../../../lib/config.js");
      const validation = validateImageUpload({ type: data.mimetype, size: 0 });
      if (!validation.isValid) {
        return reply.status(400).send({ error: validation.error ?? "Invalid upload" });
      }

      const { data: contact, error: contactError } = await client
        .from("people")
        .select("id, myself")
        .eq("id", contactId)
        .eq("user_id", user.id)
        .single();

      if (contactError || !contact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      const buffer = await data.toBuffer();

      if (!validateImageMagicBytes(buffer)) {
        return reply
          .status(400)
          .send({ error: "File content does not match a valid image format" });
      }

      const adminClient = createAdminClient();

      try {
        await uploadContactAvatarAndSetFlag(
          client,
          adminClient,
          user.id,
          contactId,
          buffer,
          data.mimetype,
        );
      } catch {
        return reply.status(500).send({ error: "Failed to upload photo" });
      }

      const avatarUrl = resolveContactAvatarUrl(client, user.id, {
        id: contactId,
        hasAvatar: true,
        updatedAt: new Date().toISOString(),
      });
      const cacheBustedUrl = avatarUrl
        ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
        : avatarUrl;

      return { success: true, avatarUrl: cacheBustedUrl };
    },
  );

  /**
   * DELETE /api/contacts/:id/photo - Delete contact photo
   */
  fastify.delete(
    "/:id/photo",
    {
      schema: {
        description: "Delete a contact photo.",
        params: uuidParamSchema,
        response: withOkResponse(apiSuccessResponseSchema, "Photo deleted"),
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id: contactId } = request.params;

      const { data: contact, error: contactError } = await client
        .from("people")
        .select("id, myself")
        .eq("id", contactId)
        .eq("user_id", user.id)
        .single();

      if (contactError || !contact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      const adminClient = createAdminClient();
      await deleteContactAvatarAndClearFlag(client, adminClient, user.id, contactId);

      return { success: true };
    },
  );
}
