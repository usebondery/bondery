/**
 * Me API Routes
 * Handles authenticated user profile operations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";
import { createAdminClient } from "../../lib/supabase.js";
import { getAuth } from "../../lib/auth.js";
import { validateImageUpload, validateImageMagicBytes } from "../../lib/config.js";
import {
  CONTACT_SELECT,
  AvatarQualityEnum,
  AvatarSizeEnum,
  extractAvatarOptions,
} from "../../lib/schemas.js";
import { attachContactExtras } from "../../lib/contact-enrichment.js";

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

export async function meRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Me"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * PATCH /api/me - Update user account metadata
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
   * DELETE /api/me - Delete user account
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
   * POST /api/me/photo - Upload profile photo
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

    const avatarUrl = publicUrlData?.publicUrl || null;

    if (!avatarUrl) {
      return reply.status(500).send({ error: "Failed to generate avatar URL" });
    }

    // Touch the myself contact's updated_at so the contacts list picks up the
    // new avatar URL (which is cache-busted by the updated_at timestamp).
    await client
      .from("people")
      .update({ updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("myself", true);

    return { success: true, data: { avatarUrl } };
  });

  /**
   * DELETE /api/me/photo - Delete profile photo
   */
  fastify.delete("/photo", async (request: FastifyRequest, reply: FastifyReply) => {
    const { client, user } = getAuth(request);
    const adminClient = createAdminClient();

    const fileName = getAccountAvatarFileName(user.id);

    // Delete account photo
    await adminClient.storage.from(AVATARS_BUCKET).remove([fileName]);

    // Touch the myself contact so the contacts list invalidates its avatar cache
    await client
      .from("people")
      .update({ updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("myself", true);

    return { success: true };
  });

  /**
   * GET /api/me/person - Fetch the authenticated user's "myself" contact
   */
  fastify.get(
    "/person",
    {
      schema: {
        querystring: Type.Object({
          avatarQuality: Type.Optional(AvatarQualityEnum),
          avatarSize: Type.Optional(AvatarSizeEnum),
        }),
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { avatarQuality?: string; avatarSize?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const avatarOpts = extractAvatarOptions(request.query as any);

      const { data: contact, error } = await client
        .from("people")
        .select(CONTACT_SELECT)
        .eq("user_id", user.id)
        .eq("myself", true)
        .single();

      if (error || !contact) {
        return reply.status(404).send({ error: "Myself contact not found" });
      }

      try {
        const [enrichedContact] = await attachContactExtras(client, user.id, [contact], {
          addresses: true,
          avatarOptions: avatarOpts,
        });
        return { contact: enrichedContact };
      } catch (enrichError) {
        request.log.error({ enrichError }, "Failed to enrich myself contact");
        return reply.status(500).send({ error: "Failed to load profile contact" });
      }
    },
  );
}
