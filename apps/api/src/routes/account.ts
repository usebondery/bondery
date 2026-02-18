/**
 * Account API Routes
 * Handles user account operations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth, createAdminClient } from "../lib/supabase.js";
import { validateImageUpload } from "../lib/config.js";
import type { UpdateAccountInput } from "@bondery/types";

const AVATARS_BUCKET = "avatars";

function getAccountAvatarFileName(userId: string): string {
  return `${userId}/${userId}.jpg`;
}

export async function accountRoutes(fastify: FastifyInstance) {
  /**
   * PATCH /api/account - Update user account metadata
   */
  fastify.patch(
    "/",
    async (request: FastifyRequest<{ Body: UpdateAccountInput }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client } = auth;
      const { name, middlename, surname } = request.body;

      const { data, error } = await client.auth.updateUser({
        data: { name, middlename, surname },
      });

      if (error) {
        return reply.status(500).send({ error: "Failed to update account" });
      }

      return { success: true, data: data.user };
    },
  );

  /**
   * DELETE /api/account - Delete user account
   */
  fastify.delete("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const { client, user } = auth;
    const adminClient = createAdminClient();

    try {
      // Delete user's storage files first
      const { data: files } = await adminClient.storage.from(AVATARS_BUCKET).list(user.id);

      if (files && files.length > 0) {
        const filePaths = files.map((file) => `${user.id}/${file.name}`);
        await adminClient.storage.from(AVATARS_BUCKET).remove(filePaths);
      }

      // Delete user using admin client
      const { error } = await adminClient.auth.admin.deleteUser(user.id);

      if (error) {
        return reply.status(500).send({ error: "Failed to delete account" });
      }

      return { success: true };
    } catch (error) {
      return reply.status(500).send({
        error: "Internal server error",
        description: String(error),
      });
    }
  });

  /**
   * POST /api/account/photo - Upload profile photo
   */
  fastify.post("/photo", async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const { client, user } = auth;
    const adminClient = createAdminClient();

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "No file provided" });
    }

    const buffer = await data.toBuffer();
    const validation = validateImageUpload({ type: data.mimetype, size: buffer.length });
    if (!validation.isValid) {
      return reply.status(400).send({ error: validation.error });
    }

    const fileName = getAccountAvatarFileName(user.id);

    // Delete existing account photo
    await adminClient.storage.from(AVATARS_BUCKET).remove([fileName]);

    // Upload new file
    const { error: uploadError } = await adminClient.storage
      .from(AVATARS_BUCKET)
      .upload(fileName, buffer, {
        contentType: data.mimetype,
        upsert: true,
      });

    if (uploadError) {
      return reply.status(500).send({
        error: "Failed to upload profile photo",
        description: uploadError.message,
      });
    }

    // Get public URL
    const { data: publicUrlData } = adminClient.storage.from(AVATARS_BUCKET).getPublicUrl(fileName);

    const avatarUrl = publicUrlData?.publicUrl
      ? `${publicUrlData.publicUrl}?t=${Date.now()}`
      : null;

    if (!avatarUrl) {
      return reply.status(500).send({ error: "Failed to generate avatar URL" });
    }

    // Store in user_settings
    const { error: updateError } = await client
      .from("user_settings")
      .upsert({ user_id: user.id, avatar_url: avatarUrl }, { onConflict: "user_id" });

    if (updateError) {
      return reply.status(500).send({ error: "Failed to update user profile" });
    }

    return { success: true, data: { avatarUrl } };
  });

  /**
   * DELETE /api/account/photo - Delete profile photo
   */
  fastify.delete("/photo", async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const { client, user } = auth;
    const adminClient = createAdminClient();

    const fileName = getAccountAvatarFileName(user.id);

    // Delete account photo
    await adminClient.storage.from(AVATARS_BUCKET).remove([fileName]);

    // Update user_settings
    await client.from("user_settings").update({ avatar_url: null }).eq("user_id", user.id);

    return { success: true };
  });
}
