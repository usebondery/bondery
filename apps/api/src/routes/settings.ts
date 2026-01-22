/**
 * Settings API Routes
 * Handles user settings/preferences
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireAuth } from "../lib/supabase.js";
import type { UpdateUserSettingsInput } from "@bondery/types";

export async function settingsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/settings - Get user settings
   */
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = await requireAuth(request, reply);
    if (!auth) return;

    const { client, user } = auth;

    // Get user info for email/providers
    const { data: userData } = await client.auth.getUser();

    // Get settings from database
    const { data: settings, error } = await client
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      return reply.status(500).send({ error: "Failed to fetch settings" });
    }

    // Insert defaults if no settings exist
    if (!settings) {
      // Get name from user metadata if available
      const defaultName =
        userData?.user?.user_metadata?.name || userData?.user?.user_metadata?.full_name || "";

      const { data: newSettings, error: insertError } = await client
        .from("user_settings")
        .insert({
          user_id: user.id,
          name: defaultName,
          middlename: "",
          surname: "",
          timezone: "UTC",
          language: "en",
        })
        .select()
        .single();

      if (insertError) {
        return reply.status(500).send({ error: "Failed to create default settings" });
      }

      return {
        success: true,
        data: {
          ...newSettings,
          email: userData?.user?.email,
          avatar_url: userData?.user?.user_metadata?.avatar_url || null,
          providers: userData?.user?.app_metadata?.providers || [],
        },
      };
    }

    return {
      success: true,
      data: {
        ...settings,
        email: userData?.user?.email,
        avatar_url: settings.avatar_url || userData?.user?.user_metadata?.avatar_url || null,
        providers: userData?.user?.app_metadata?.providers || [],
      },
    };
  });

  /**
   * PATCH /api/settings - Update user settings
   */
  fastify.patch(
    "/",
    async (request: FastifyRequest<{ Body: UpdateUserSettingsInput }>, reply: FastifyReply) => {
      const auth = await requireAuth(request, reply);
      if (!auth) return;

      const { client, user } = auth;
      const { name, middlename, surname, timezone, language } = request.body;

      // Check if settings exist
      const { data: existingSettings } = await client
        .from("user_settings")
        .select("id")
        .eq("user_id", user.id)
        .single();

      let result;

      if (existingSettings) {
        // Update existing
        const { data, error } = await client
          .from("user_settings")
          .update({ name, middlename, surname, timezone, language })
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) {
          return reply.status(500).send({ error: "Failed to update settings" });
        }
        result = data;
      } else {
        // Insert new
        const { data, error } = await client
          .from("user_settings")
          .insert({ user_id: user.id, name, middlename, surname, timezone, language })
          .select()
          .single();

        if (error) {
          return reply.status(500).send({ error: "Failed to create settings" });
        }
        result = data;
      }

      // Sync display_name in auth.users
      const displayName = [result.name, result.middlename, result.surname]
        .filter(Boolean)
        .join(" ")
        .trim();

      if (displayName) {
        await client.auth.updateUser({ data: { name: displayName } });
      }

      return { success: true, data: result };
    },
  );
}
