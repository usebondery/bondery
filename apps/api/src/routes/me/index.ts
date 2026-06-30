/**
 * Me API Routes
 * Handles authenticated user profile operations
 */

import type { FastifyReply } from "fastify";
import type { AppFastifyInstance, AppRoutePlugin } from "../../lib/fastify-types.js";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { createAdminClient, resolveContactAvatarUrl } from "../../lib/supabase.js";
import {
  uploadContactAvatarAndSetFlag,
  deleteContactAvatarAndClearFlag,
} from "../../lib/avatar-storage.js";
import { getAuth } from "../../lib/auth.js";
import { validateImageUpload, validateImageMagicBytes } from "../../lib/config.js";
import { CONTACT_SELECT, extractAvatarOptions } from "../../lib/queries.js";
import { avatarTransformQuerySchema } from "@bondery/schemas/http";
import { updateAccountInputSchema } from "@bondery/schemas";
import { attachContactExtras } from "../../lib/contact-enrichment.js";

const LINKEDIN_LOGOS_BUCKET = "linkedin_logos";

export const meRoutes: AppRoutePlugin = async (fastify) => {
  fastify.addHook("onRoute", (routeOptions) => {
    if (routeOptions.schema) {
      routeOptions.schema.tags = ["Me"];
    }
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  /**
   * PATCH /api/me - Update user account metadata
   */
  fastify.patch(
    "/",
    {
      schema: {
        body: updateAccountInputSchema,
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
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
  fastify.delete("/", async (request, reply) => {
    const { client, user } = getAuth(request);
    const adminClient = createAdminClient();

    try {
      // Delete user's storage files first
      const { data: avatarFiles } = await adminClient.storage.from("avatars").list(user.id);
      if (avatarFiles && avatarFiles.length > 0) {
        const avatarPaths = avatarFiles.map((file) => `${user.id}/${file.name}`);
        await adminClient.storage.from("avatars").remove(avatarPaths);
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
  fastify.post("/photo", async (request, reply) => {
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

    try {
      await uploadContactAvatarAndSetFlag(
        client,
        adminClient,
        user.id,
        user.id,
        buffer,
        data.mimetype,
      );
    } catch (uploadError) {
      return reply.status(500).send({
        error: "Failed to upload profile photo",
        description: uploadError instanceof Error ? uploadError.message : String(uploadError),
      });
    }

    const avatarUrl = resolveContactAvatarUrl(client, user.id, {
      id: user.id,
      hasAvatar: true,
      updatedAt: new Date().toISOString(),
    });

    if (!avatarUrl) {
      return reply.status(500).send({ error: "Failed to generate avatar URL" });
    }

    return { success: true, data: { avatarUrl } };
  });

  /**
   * DELETE /api/me/photo - Delete profile photo
   */
  fastify.delete("/photo", async (request, reply) => {
    const { client, user } = getAuth(request);
    const adminClient = createAdminClient();

    await deleteContactAvatarAndClearFlag(client, adminClient, user.id, user.id);

    return { success: true };
  });

  /**
   * GET /api/me/person - Fetch the authenticated user's "myself" contact
   */
  fastify.get(
    "/person",
    {
      schema: {
        querystring: avatarTransformQuerySchema,
      } satisfies FastifyZodOpenApiSchema,
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const avatarOpts = extractAvatarOptions(request.query);

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
