/**
 * Contact photo upload and delete routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getAuth } from "../../../lib/auth.js";
import { buildContactAvatarUrl, createAdminClient } from "../../../lib/supabase.js";
import { UuidParam } from "../../../lib/schemas.js";

export function registerPhotoRoutes(fastify: FastifyInstance): void {
  /**
   * POST /api/contacts/:id/photo - Upload contact photo
   */
  fastify.post(
    "/:id/photo",
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { id: contactId } = request.params;

      // Get uploaded file
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: "No file provided" });
      }

      // Validate file
      const { validateImageUpload, validateImageMagicBytes } =
        await import("../../../lib/config.js");
      const validation = validateImageUpload({ type: data.mimetype, size: 0 }); // Size checked by multipart limits
      if (!validation.isValid) {
        return reply.status(400).send({ error: validation.error });
      }

      // Verify contact belongs to user
      const { data: contact, error: contactError } = await client
        .from("people")
        .select("id, myself")
        .eq("id", contactId)
        .eq("user_id", user.id)
        .single();

      if (contactError || !contact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      // Upload to storage
      const buffer = await data.toBuffer();

      if (!validateImageMagicBytes(buffer)) {
        return reply
          .status(400)
          .send({ error: "File content does not match a valid image format" });
      }
      // After migration 20260326100000, myself contacts have people.id = user_id,
      // so the file path avatars/{userId}/{contactId}.jpg is already the settings avatar path.
      const fileName = `${user.id}/${contactId}.jpg`;
      const adminClient = createAdminClient();

      // Delete existing file first to ensure the new one is always stored
      await adminClient.storage.from("avatars").remove([fileName]);

      const { error: uploadError } = await adminClient.storage
        .from("avatars")
        .upload(fileName, buffer, {
          contentType: data.mimetype,
          upsert: true,
        });

      if (uploadError) {
        return reply.status(500).send({ error: "Failed to upload photo" });
      }

      // Touch updated_at so the avatar URL includes a fresh cache-busting timestamp
      await client
        .from("people")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", contactId)
        .eq("user_id", user.id);

      const avatarUrl = buildContactAvatarUrl(client, user.id, contactId);
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
    { schema: { params: UuidParam } },
    async (request: FastifyRequest<{ Params: typeof UuidParam.static }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);
      const { id: contactId } = request.params;

      // Verify contact belongs to user
      const { data: contact, error: contactError } = await client
        .from("people")
        .select("id, myself")
        .eq("id", contactId)
        .eq("user_id", user.id)
        .single();

      if (contactError || !contact) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      // After migration 20260326100000, myself contacts have people.id = user_id,
      // so avatars/{userId}/{contactId}.jpg is already the settings avatar path.
      const fileName = `${user.id}/${contactId}.jpg`;
      await createAdminClient().storage.from("avatars").remove([fileName]);

      // Touch updated_at so the avatar URL cache is invalidated on next fetch
      await client
        .from("people")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", contactId)
        .eq("user_id", user.id);

      return { success: true };
    },
  );
}
