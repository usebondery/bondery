/**
 * Redirect API Routes
 * Handles browser extension integration for creating/updating contacts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createAuthenticatedClient } from "../lib/supabase.js";
import { validateImageUpload, URLS } from "../lib/config.js";
import type { RedirectRequest } from "@bondery/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@bondery/types/supabase.types";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers";
import {
  findPersonIdBySocialMedia,
  type SocialMediaPlatform,
  upsertContactSocialMedia,
} from "../lib/social-media.js";
import { cleanPersonName } from "@bondery/helpers/name-utils";
import { assignContactsToDefaultImportGroup } from "../lib/default-import-groups.js";

function resolvePrimarySocialMedia(payload: {
  instagram?: string;
  linkedin?: string;
  facebook?: string;
}): { platform: SocialMediaPlatform; handle: string } | null {
  if (payload.instagram?.trim()) {
    return { platform: "instagram", handle: payload.instagram.trim() };
  }

  if (payload.linkedin?.trim()) {
    return { platform: "linkedin", handle: payload.linkedin.trim() };
  }

  if (payload.facebook?.trim()) {
    return { platform: "facebook", handle: payload.facebook.trim() };
  }

  return null;
}

function resolveExtensionDefaultGroup(platform: SocialMediaPlatform) {
  if (platform === "linkedin") {
    return "extension_linkedin" as const;
  }

  if (platform === "instagram") {
    return "extension_instagram" as const;
  }

  return null;
}

export async function redirectRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/redirect - Create or find contact from browser extension
   */
  fastify.post(
    "/",
    async (request: FastifyRequest<{ Body: RedirectRequest }>, reply: FastifyReply) => {
      const { client, user } = await createAuthenticatedClient(request);

      if (!user) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const {
        instagram,
        linkedin,
        facebook,
        firstName,
        middleName,
        lastName,
        profileImageUrl,
        headline,
        place,
        notes,
      } = request.body;

      if (!instagram && !linkedin && !facebook) {
        return reply.status(400).send({
          error: "Instagram, LinkedIn, or Facebook username is required",
        });
      }

      const primarySocialMedia = resolvePrimarySocialMedia({ instagram, linkedin, facebook });
      if (!primarySocialMedia) {
        return reply.status(400).send({
          error: "Instagram, LinkedIn, or Facebook username is required",
        });
      }

      let existingContactId: string | null = null;
      try {
        existingContactId = await findPersonIdBySocialMedia(
          client,
          user.id,
          primarySocialMedia.platform,
          primarySocialMedia.handle,
        );
      } catch {
        return reply.status(500).send({ error: "Failed to look up contact" });
      }

      let existingContact: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        avatar: string | null;
        headline: string | null;
        place: string | null;
        notes: string | null;
      } | null = null;

      if (existingContactId) {
        const { data: contactData, error: lookupError } = await client
          .from("people")
          .select("id, first_name, last_name, avatar, headline, place, notes")
          .eq("user_id", user.id)
          .eq("id", existingContactId)
          .single();

        if (lookupError) {
          return reply.status(500).send({ error: "Failed to look up contact" });
        }

        existingContact = contactData;
      }

      // If contact exists
      if (existingContact) {
        // Update photo if provided and contact doesn't have one
        if (profileImageUrl && !existingContact.avatar) {
          await updateContactPhoto(client, existingContact.id, user.id, profileImageUrl);
        }

        // Update headline if provided and contact doesn't have one
        if (headline && !existingContact.headline) {
          await client.from("people").update({ headline }).eq("id", existingContact.id);
        }

        // Update place if provided and contact doesn't have one
        if (place && !existingContact.place) {
          await client.from("people").update({ place }).eq("id", existingContact.id);
        }

        // Update notes if provided and contact doesn't have one
        if (notes && !existingContact.notes) {
          await client.from("people").update({ notes }).eq("id", existingContact.id);
        }

        return {
          contactId: existingContact.id,
          existed: true,
          firstName: existingContact.first_name ?? undefined,
          lastName: existingContact.last_name,
          avatar: existingContact.avatar,
        };
      }

      // Create new contact
      const insertData: any = {
        user_id: user.id,
        first_name: cleanPersonName(firstName) || primarySocialMedia.handle || "Unknown",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const cleanedMiddleName = cleanPersonName(middleName);
      const cleanedLastName = cleanPersonName(lastName);
      if (cleanedMiddleName) insertData.middle_name = cleanedMiddleName;
      if (cleanedLastName) insertData.last_name = cleanedLastName;
      if (headline) insertData.headline = headline;
      if (place) insertData.place = place;
      if (notes) insertData.notes = notes;

      const { data: newContact, error: createError } = await client
        .from("people")
        .insert(insertData)
        .select("id")
        .single();

      if (createError || !newContact) {
        return reply.status(500).send({ error: "Failed to create contact" });
      }

      try {
        await upsertContactSocialMedia(
          client,
          user.id,
          newContact.id,
          primarySocialMedia.platform,
          primarySocialMedia.handle,
        );
      } catch {
        return reply.status(500).send({ error: "Failed to save social media" });
      }

      const extensionGroup = resolveExtensionDefaultGroup(primarySocialMedia.platform);
      if (extensionGroup) {
        try {
          await assignContactsToDefaultImportGroup(client, user.id, extensionGroup, [
            newContact.id,
          ]);
        } catch {
          return reply.status(500).send({ error: "Failed to assign default group" });
        }
      }

      // Upload profile photo if provided
      if (profileImageUrl) {
        await updateContactPhoto(client, newContact.id, user.id, profileImageUrl);
      }

      return { contactId: newContact.id, existed: false };
    },
  );

  /**
   * GET /api/redirect - Browser redirect endpoint (creates contact and redirects to app)
   */
  fastify.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as Record<string, string>;
    const {
      instagram,
      linkedin,
      facebook,
      firstName,
      middleName,
      lastName,
      profileImageUrl,
      headline,
      place,
    } = query;

    if (!instagram && !linkedin && !facebook) {
      return reply.status(400).send({
        error: "Instagram, LinkedIn, or Facebook username is required",
      });
    }

    const primarySocialMedia = resolvePrimarySocialMedia({ instagram, linkedin, facebook });
    if (!primarySocialMedia) {
      return reply.status(400).send({
        error: "Instagram, LinkedIn, or Facebook username is required",
      });
    }

    const { client, user } = await createAuthenticatedClient(request);

    if (!user) {
      // Redirect to login with return URL
      const searchParams = new URLSearchParams(query);
      const returnUrl = `${API_ROUTES.REDIRECT}?${searchParams.toString()}`;
      return reply.redirect(
        `${URLS.webapp}${URLS.login}?returnUrl=${encodeURIComponent(returnUrl)}`,
      );
    }

    let existingContactId: string | null = null;
    try {
      existingContactId = await findPersonIdBySocialMedia(
        client,
        user.id,
        primarySocialMedia.platform,
        primarySocialMedia.handle,
      );
    } catch {
      return reply.status(500).send({ error: "Failed to look up contact" });
    }

    let existingContact: {
      id: string;
      avatar: string | null;
      headline: string | null;
      place: string | null;
    } | null = null;

    if (existingContactId) {
      const { data: contactData, error: lookupError } = await client
        .from("people")
        .select("id, avatar, headline, place")
        .eq("user_id", user.id)
        .eq("id", existingContactId)
        .single();

      if (lookupError) {
        return reply.status(500).send({ error: "Failed to look up contact" });
      }

      existingContact = contactData;
    }

    // If contact exists
    if (existingContact) {
      if (profileImageUrl && !existingContact.avatar) {
        await updateContactPhoto(client, existingContact.id, user.id, profileImageUrl);
      }
      if (headline && !existingContact.headline) {
        await client.from("people").update({ headline }).eq("id", existingContact.id);
      }
      if (place && !existingContact.place) {
        await client.from("people").update({ place }).eq("id", existingContact.id);
      }

      return reply.redirect(`${URLS.webapp}${WEBAPP_ROUTES.PERSON}/${existingContact.id}`);
    }

    // Create new contact
    const insertData: any = {
      user_id: user.id,
      first_name: cleanPersonName(firstName) || primarySocialMedia.handle || "Unknown",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const cleanedMiddleName = cleanPersonName(middleName);
    const cleanedLastName = cleanPersonName(lastName);
    if (cleanedMiddleName) insertData.middle_name = cleanedMiddleName;
    if (cleanedLastName) insertData.last_name = cleanedLastName;
    if (headline) insertData.headline = headline;
    if (place) insertData.place = place;

    const { data: newContact, error: createError } = await client
      .from("people")
      .insert(insertData)
      .select("id")
      .single();

    if (createError || !newContact) {
      return reply.status(500).send({ error: "Failed to create contact" });
    }

    try {
      await upsertContactSocialMedia(
        client,
        user.id,
        newContact.id,
        primarySocialMedia.platform,
        primarySocialMedia.handle,
      );
    } catch {
      return reply.status(500).send({ error: "Failed to save social media" });
    }

    const extensionGroup = resolveExtensionDefaultGroup(primarySocialMedia.platform);
    if (extensionGroup) {
      try {
        await assignContactsToDefaultImportGroup(client, user.id, extensionGroup, [newContact.id]);
      } catch {
        return reply.status(500).send({ error: "Failed to assign default group" });
      }
    }

    if (profileImageUrl) {
      await updateContactPhoto(client, newContact.id, user.id, profileImageUrl);
    }

    return reply.redirect(`${URLS.webapp}${WEBAPP_ROUTES.PERSON}/${newContact.id}`);
  });
}

/**
 * Helper to update contact photo from URL
 */
async function updateContactPhoto(
  supabase: SupabaseClient<Database>,
  contactId: string,
  userId: string,
  imageUrl: string,
): Promise<void> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return;

    const blob = await response.blob();

    const validation = validateImageUpload({
      type: blob.type,
      size: blob.size,
    });
    if (!validation.isValid) return;

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = `${userId}/${contactId}.jpg`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, buffer, {
      contentType: blob.type,
      upsert: true,
    });

    if (uploadError) return;

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);

    if (urlData?.publicUrl) {
      await supabase.from("people").update({ avatar: urlData.publicUrl }).eq("id", contactId);
    }
  } catch (error) {
    console.error("Error in updateContactPhoto:", error);
  }
}
