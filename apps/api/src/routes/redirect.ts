/**
 * Redirect API Routes
 * Handles browser extension integration for creating/updating contacts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createAuthenticatedClient } from "../lib/supabase.js";
import { validateImageUpload, URLS } from "../lib/config.js";
import type {
  RedirectRequest,
  ScrapedWorkHistoryEntry,
  ScrapedEducationEntry,
} from "@bondery/types";
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
import { cachedGeocodeLinkedInPlace } from "../lib/mapy.js";
import {
  toPostgresDate,
  updateContactPhoto,
  uploadAllLinkedInLogos,
} from "../lib/linkedin-helpers.js";

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
        workHistory,
        educationHistory,
        linkedinBio,
      } = request.body;

      request.log.info(
        { handle: linkedin ?? instagram ?? facebook, workHistoryCount: workHistory?.length ?? 0 },
        "[redirect] POST received",
      );

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
        latitude: number | null;
        notes: string | null;
        linkedin_bio: string | null;
      } | null = null;

      if (existingContactId) {
        const { data: contactData, error: lookupError } = await (client
          .from("people")
          .select(
            "id, first_name, last_name, avatar, headline, place, latitude, notes, linkedin_bio",
          )
          .eq("user_id", user.id)
          .eq("id", existingContactId)
          .single() as unknown as Promise<{
          data: {
            id: string;
            first_name: string | null;
            last_name: string | null;
            avatar: string | null;
            headline: string | null;
            place: string | null;
            latitude: number | null;
            notes: string | null;
            linkedin_bio: string | null;
          } | null;
          error: unknown;
        }>);

        if (lookupError) {
          return reply.status(500).send({ error: "Failed to look up contact" });
        }

        existingContact = contactData;
      }

      // Upload all LinkedIn logos in parallel (used by both existing and new contact paths)
      const logoMap = await uploadAllLinkedInLogos(client, user.id, workHistory, educationHistory);

      // If contact exists
      if (existingContact) {
        // Update photo if provided and contact doesn't have one
        if (profileImageUrl && !existingContact.avatar) {
          await updateContactPhoto(client, existingContact.id, user.id, profileImageUrl);
        }

        // Consolidate field updates into a single query
        const fieldUpdates: Record<string, any> = {};
        if (headline && !existingContact.headline) fieldUpdates.headline = headline;
        if (place && !existingContact.place) fieldUpdates.place = place;
        if (notes && !existingContact.notes) fieldUpdates.notes = notes;
        if (linkedinBio && !existingContact.linkedin_bio) fieldUpdates.linkedin_bio = linkedinBio;

        // Geocode the place if it's being set for the first time and no coordinates exist yet
        if (place && !existingContact.place && !existingContact.latitude) {
          try {
            const result = await cachedGeocodeLinkedInPlace(place);
            if (result) {
              const { geo, timezone: tz } = result;
              // Use the formatted mapy.com label as the canonical place value
              if (geo.formattedLabel) fieldUpdates.place = geo.formattedLabel;
              fieldUpdates.location = geo.locationEwkt;
              if (geo.city) fieldUpdates.address_city = geo.city;
              if (geo.state) fieldUpdates.address_state = geo.state;
              if (geo.stateCode) fieldUpdates.address_state_code = geo.stateCode;
              if (geo.country) fieldUpdates.address_country = geo.country;
              if (geo.countryCode) fieldUpdates.address_country_code = geo.countryCode;
              if (geo.formattedLabel) fieldUpdates.address_formatted = geo.formattedLabel;
              fieldUpdates.address_granularity = "city";
              fieldUpdates.address_geocode_source = "mapy.com";

              if (tz) fieldUpdates.timezone = tz;
            }
          } catch (err) {
            console.error(
              "[redirect] Geocode failed for existing contact, continuing without coordinates:",
              err,
            );
          }
        }

        if (Object.keys(fieldUpdates).length > 0) {
          await client.from("people").update(fieldUpdates).eq("id", existingContact.id);
        }

        // Upsert work history if provided (replace existing rows)
        if (workHistory && workHistory.length > 0) {
          await client
            .from("people_work_history")
            .delete()
            .eq("person_id", existingContact.id)
            .eq("user_id", user.id);

          const rows = workHistory.map((entry: ScrapedWorkHistoryEntry) => ({
            user_id: user.id,
            person_id: existingContact!.id,
            company_name: entry.companyName,
            company_linkedin_id: entry.companyLinkedinId ?? null,
            title: entry.title ?? null,
            description: entry.description ?? null,
            start_date: toPostgresDate(entry.startDate),
            end_date: toPostgresDate(entry.endDate),
            employment_type: entry.employmentType ?? null,
            location: entry.location ?? null,
          }));
          const { error: whError } = await client.from("people_work_history").insert(rows);
          if (whError) {
            console.error(
              "[redirect] Failed to insert work history for existing contact:",
              whError.message,
            );
          }
        }

        // Upsert education history if provided (replace existing rows)
        if (educationHistory && educationHistory.length > 0) {
          await client
            .from("people_education_history")
            .delete()
            .eq("person_id", existingContact.id)
            .eq("user_id", user.id);

          const rows = educationHistory.map((entry: ScrapedEducationEntry) => ({
            user_id: user.id,
            person_id: existingContact!.id,
            school_name: entry.schoolName,
            school_linkedin_id: entry.schoolLinkedinId ?? null,
            degree: entry.degree ?? null,
            description: entry.description ?? null,
            start_date: toPostgresDate(entry.startDate),
            end_date: toPostgresDate(entry.endDate),
          }));
          const { error: ehError } = await client.from("people_education_history").insert(rows);
          if (ehError) {
            console.error(
              "[redirect] Failed to insert education for existing contact:",
              ehError.message,
            );
          }
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
      if (linkedinBio) insertData.linkedin_bio = linkedinBio;

      // Geocode the LinkedIn place string to get coordinates and structured address
      if (place) {
        try {
          const result = await cachedGeocodeLinkedInPlace(place);
          if (result) {
            const { geo, timezone: tz } = result;
            // Use the formatted mapy.com label as the canonical place value
            if (geo.formattedLabel) insertData.place = geo.formattedLabel;
            insertData.location = geo.locationEwkt;
            if (geo.city) insertData.address_city = geo.city;
            if (geo.state) insertData.address_state = geo.state;
            if (geo.stateCode) insertData.address_state_code = geo.stateCode;
            if (geo.country) insertData.address_country = geo.country;
            if (geo.countryCode) insertData.address_country_code = geo.countryCode;
            if (geo.formattedLabel) insertData.address_formatted = geo.formattedLabel;
            insertData.address_granularity = "city";
            insertData.address_geocode_source = "mapy.com";

            if (tz) insertData.timezone = tz;
          }
        } catch (err) {
          console.error(
            "[redirect] Geocode failed for new contact, continuing without coordinates:",
            err,
          );
        }
      }

      const { data: newContact, error: createError } = await client
        .from("people")
        .insert(insertData)
        .select("id")
        .single();

      if (createError || !newContact) {
        console.error(
          "[redirect] Failed to create contact:",
          createError?.message ?? "no data returned",
        );
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

      // Insert work history if provided
      if (workHistory && workHistory.length > 0) {
        request.log.info(
          { personId: newContact.id, count: workHistory.length },
          "[redirect] Inserting work history for new contact",
        );
        const rows = workHistory.map((entry: ScrapedWorkHistoryEntry) => ({
          user_id: user.id,
          person_id: newContact.id,
          company_name: entry.companyName,
          company_linkedin_id: entry.companyLinkedinId ?? null,
          title: entry.title ?? null,
          description: entry.description ?? null,
          start_date: toPostgresDate(entry.startDate),
          end_date: toPostgresDate(entry.endDate),
          employment_type: entry.employmentType ?? null,
          location: entry.location ?? null,
        }));
        const { error: whError } = await client.from("people_work_history").insert(rows);
        if (whError) {
          console.error("[redirect] Failed to insert work history:", whError.message);
        }
      }

      // Insert education history if provided
      if (educationHistory && educationHistory.length > 0) {
        const rows = educationHistory.map((entry: ScrapedEducationEntry) => ({
          user_id: user.id,
          person_id: newContact.id,
          school_name: entry.schoolName,
          school_linkedin_id: entry.schoolLinkedinId ?? null,
          degree: entry.degree ?? null,
          description: entry.description ?? null,
          start_date: toPostgresDate(entry.startDate),
          end_date: toPostgresDate(entry.endDate),
        }));
        const { error: ehError } = await client.from("people_education_history").insert(rows);
        if (ehError) {
          console.error("[redirect] Failed to insert education:", ehError.message);
        }
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
      latitude: number | null;
    } | null = null;

    if (existingContactId) {
      const { data: contactData, error: lookupError } = await client
        .from("people")
        .select("id, avatar, headline, place, latitude")
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

      // Consolidate field updates into a single query
      const fieldUpdates: Record<string, any> = {};
      if (headline && !existingContact.headline) fieldUpdates.headline = headline;
      if (place && !existingContact.place) fieldUpdates.place = place;

      // Geocode the place if it's being set for the first time and no coordinates exist yet
      if (place && !existingContact.place && !existingContact.latitude) {
        try {
          const result = await cachedGeocodeLinkedInPlace(place);
          if (result) {
            const { geo, timezone: tz } = result;
            if (geo.formattedLabel) fieldUpdates.place = geo.formattedLabel;
            fieldUpdates.location = geo.locationEwkt;
            if (geo.city) fieldUpdates.address_city = geo.city;
            if (geo.state) fieldUpdates.address_state = geo.state;
            if (geo.stateCode) fieldUpdates.address_state_code = geo.stateCode;
            if (geo.country) fieldUpdates.address_country = geo.country;
            if (geo.countryCode) fieldUpdates.address_country_code = geo.countryCode;
            if (geo.formattedLabel) fieldUpdates.address_formatted = geo.formattedLabel;
            fieldUpdates.address_granularity = "city";
            fieldUpdates.address_geocode_source = "mapy.com";

            if (tz) fieldUpdates.timezone = tz;
          }
        } catch (err) {
          console.error(
            "[redirect] Geocode failed for existing contact (GET), continuing without coordinates:",
            err,
          );
        }
      }

      if (Object.keys(fieldUpdates).length > 0) {
        await client.from("people").update(fieldUpdates).eq("id", existingContact.id);
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

    // Geocode the LinkedIn place string to get coordinates and structured address
    if (place) {
      try {
        const result = await cachedGeocodeLinkedInPlace(place);
        if (result) {
          const { geo, timezone: tz } = result;
          if (geo.formattedLabel) insertData.place = geo.formattedLabel;
          insertData.location = geo.locationEwkt;
          if (geo.city) insertData.address_city = geo.city;
          if (geo.state) insertData.address_state = geo.state;
          if (geo.stateCode) insertData.address_state_code = geo.stateCode;
          if (geo.country) insertData.address_country = geo.country;
          if (geo.countryCode) insertData.address_country_code = geo.countryCode;
          if (geo.formattedLabel) insertData.address_formatted = geo.formattedLabel;
          insertData.address_granularity = "city";
          insertData.address_geocode_source = "mapy.com";

          if (tz) insertData.timezone = tz;
        }
      } catch (err) {
        console.error(
          "[redirect] Geocode failed for new contact (GET), continuing without coordinates:",
          err,
        );
      }
    }

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
