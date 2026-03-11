/**
 * Account API Routes
 * Handles user account operations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { createAdminClient } from "../../lib/supabase.js";
import { getAuth } from "../../lib/auth.js";
import { validateImageUpload, validateImageMagicBytes } from "../../lib/config.js";

const UpdateAccountBody = Type.Object({
  name: Type.Optional(Type.String()),
  middlename: Type.Optional(Type.String()),
  surname: Type.Optional(Type.String()),
});

const AVATARS_BUCKET = "avatars";
const LINKEDIN_LOGOS_BUCKET = "linkedin_logos";

function getAccountAvatarFileName(userId: string): string {
  return `${userId}/${userId}.jpg`;
}

export async function accountRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Account"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * PATCH /api/account - Update user account metadata
   */
  fastify.patch(
    "/",
    { schema: { body: UpdateAccountBody } },
    async (
      request: FastifyRequest<{ Body: typeof UpdateAccountBody.static }>,
      reply: FastifyReply,
    ) => {
      const { client } = getAuth(request);
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
    const { client, user } = getAuth(request);
    const adminClient = createAdminClient();

    try {
      // Delete user's storage files first
      const { data: avatarFiles } = await adminClient.storage.from(AVATARS_BUCKET).list(user.id);
      if (avatarFiles && avatarFiles.length > 0) {
        const avatarPaths = avatarFiles.map((file) => `${user.id}/${file.name}`);
        await adminClient.storage.from(AVATARS_BUCKET).remove(avatarPaths);
      }

      const { data: logoFiles } = await adminClient.storage
        .from(LINKEDIN_LOGOS_BUCKET)
        .list(user.id);
      if (logoFiles && logoFiles.length > 0) {
        const logoPaths = logoFiles.map((file) => `${user.id}/${file.name}`);
        await adminClient.storage.from(LINKEDIN_LOGOS_BUCKET).remove(logoPaths);
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
    const { client, user } = getAuth(request);
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

    if (!validateImageMagicBytes(buffer)) {
      return reply.status(400).send({ error: "File content does not match a valid image format" });
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
    const { error: updateError } = await client.from("user_settings").upsert(
      {
        user_id: user.id,
        avatar_url: avatarUrl,
        next_reminder_at_utc: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (updateError) {
      return reply.status(500).send({ error: "Failed to update user profile" });
    }

    return { success: true, data: { avatarUrl } };
  });

  /**
   * DELETE /api/account/photo - Delete profile photo
   */
  fastify.delete("/photo", async (request: FastifyRequest, reply: FastifyReply) => {
    const { client, user } = getAuth(request);
    const adminClient = createAdminClient();

    const fileName = getAccountAvatarFileName(user.id);

    // Delete account photo
    await adminClient.storage.from(AVATARS_BUCKET).remove([fileName]);

    // Update user_settings
    await client.from("user_settings").update({ avatar_url: null }).eq("user_id", user.id);

    return { success: true };
  });
}
