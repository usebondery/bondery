/**
 * Account API Routes
 * Handles user account operations
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth, createAdminClient } from "../lib/supabase.js";
import { validateImageUpload, URLS } from "../lib/config.js";
import type { UpdateAccountInput } from "@bondery/types";

export async function accountRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/account - Get current user account data
   */
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const { client, user } = auth;

    // Get full user data
    const { data: userData, error } = await client.auth.getUser();

    if (error || !userData.user) {
      return reply.status(500).send({ error: "Failed to retrieve user data" });
    }

    // Get user settings
    const { data: settings } = await client
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Return merged data
    return {
      success: true,
      data: {
        ...userData.user,
        user_metadata: {
          ...userData.user.user_metadata,
          name: settings?.name || userData.user.user_metadata?.name || "",
          middlename: settings?.middlename || userData.user.user_metadata?.middlename || "",
          surname: settings?.surname || userData.user.user_metadata?.surname || "",
          avatar_url: settings?.avatar_url || userData.user.user_metadata?.avatar_url || null,
        },
      },
    };
  });

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

    try {
      // Delete user's storage files first
      const { data: files } = await client.storage.from("profile-photos").list(user.id);

      if (files && files.length > 0) {
        const filePaths = files.map((file) => `${user.id}/${file.name}`);
        await client.storage.from("profile-photos").remove(filePaths);
      }

      // Delete user using admin client
      const adminClient = createAdminClient();
      const { error } = await adminClient.auth.admin.deleteUser(user.id);

      if (error) {
        return reply.status(500).send({ error: "Failed to delete account" });
      }

      // Redirect to website home
      return reply.redirect(URLS.website);
    } catch (error) {
      return reply.status(500).send({
        error: "Internal server error",
        description: String(error),
      });
    }
  });

  /**
   * POST /api/account/signout - Sign out user
   */
  fastify.post("/signout", async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const { client } = auth;

    const { error } = await client.auth.signOut();

    if (error) {
      return reply.status(500).send({ error: "Failed to sign out" });
    }

    return { success: true, message: "Signed out successfully" };
  });

  /**
   * POST /api/account/photo - Upload profile photo
   */
  fastify.post("/photo", async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const { client, user } = auth;

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "No file provided" });
    }

    const validation = validateImageUpload({ type: data.mimetype, size: 0 });
    if (!validation.isValid) {
      return reply.status(400).send({ error: validation.error });
    }

    // Delete existing photos
    const { data: existingFiles } = await client.storage.from("profile-photos").list(user.id);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map((f) => `${user.id}/${f.name}`);
      await client.storage.from("profile-photos").remove(filesToDelete);
    }

    // Upload new file
    const buffer = await data.toBuffer();
    const fileExt = data.filename.split(".").pop();
    const fileName = `${user.id}/profile.${fileExt}`;

    const { error: uploadError } = await client.storage
      .from("profile-photos")
      .upload(fileName, buffer, {
        contentType: data.mimetype,
        upsert: true,
      });

    if (uploadError) {
      return reply.status(500).send({ error: "Failed to upload profile photo" });
    }

    // Get public URL
    const { data: publicUrlData } = client.storage.from("profile-photos").getPublicUrl(fileName);

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

    // Delete files
    const { data: files } = await client.storage.from("profile-photos").list(user.id);

    if (files && files.length > 0) {
      const filesToDelete = files.map((f) => `${user.id}/${f.name}`);
      await client.storage.from("profile-photos").remove(filesToDelete);
    }

    // Update user_settings
    await client.from("user_settings").update({ avatar_url: null }).eq("user_id", user.id);

    return { success: true };
  });
}
