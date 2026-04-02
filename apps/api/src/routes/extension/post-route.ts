/**
 * Extension POST route - Create or update contact from browser extension
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { buildContactAvatarUrl } from "../../lib/supabase.js";
import { getAuth } from "../../lib/auth.js";
import type { ScrapedWorkHistoryEntry, ScrapedEducationEntry } from "@bondery/types";
import { findPersonIdBySocial, upsertContactSocials } from "../../lib/socials.js";
import { cleanPersonName } from "@bondery/helpers/name-utils";
import { assignContactsToDefaultImportGroup } from "../../lib/default-import-groups.js";
import { cachedGeocodeLinkedInLocation } from "../../lib/mapy.js";
import {
  toPostgresDate,
  updateContactPhoto,
  uploadAllLinkedInLogos,
} from "../../lib/linkedin-helpers.js";
import { RedirectBody, resolvePrimarySocial, resolveExtensionDefaultGroup } from "./helpers.js";

export function registerPostRoute(fastify: FastifyInstance): void {
  /**
   * POST /api/redirect - Create or find contact from browser extension
   */
  fastify.post(
    "/",
    { schema: { body: RedirectBody }, onRequest: fastify.auth([fastify.verifySession]) },
    async (request: FastifyRequest<{ Body: typeof RedirectBody.static }>, reply: FastifyReply) => {
      const { client, user } = getAuth(request);

      const {
        instagram,
        linkedin,
        facebook,
        firstName,
        middleName,
        lastName,
        profileImageUrl,
        headline,
        location,
        notes,
        workHistory,
        educationHistory,
        linkedinBio,
      } = request.body;

      request.log.info(
        { handle: linkedin ?? instagram ?? facebook, workHistoryCount: workHistory?.length ?? 0 },
        "[extension] POST received",
      );

      if (!instagram && !linkedin && !facebook) {
        return reply.status(400).send({
          error: "Instagram, LinkedIn, or Facebook username is required",
        });
      }

      const primarySocial = resolvePrimarySocial({ instagram, linkedin, facebook });
      if (!primarySocial) {
        return reply.status(400).send({
          error: "Instagram, LinkedIn, or Facebook username is required",
        });
      }

      let existingContactId: string | null = null;
      try {
        existingContactId = await findPersonIdBySocial(
          client,
          user.id,
          primarySocial.platform,
          primarySocial.handle,
        );
      } catch {
        return reply.status(500).send({ error: "Failed to look up contact" });
      }

      let existingContact: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        headline: string | null;
        location: string | null;
        latitude: number | null;
        notes: string | null;
      } | null = null;

      if (existingContactId) {
        const { data: contactData, error: lookupError } = await (client
          .from("people")
          .select("id, first_name, last_name, headline, location, latitude, notes")
          .eq("user_id", user.id)
          .eq("id", existingContactId)
          .single() as unknown as Promise<{
          data: {
            id: string;
            first_name: string | null;
            last_name: string | null;
            headline: string | null;
            location: string | null;
            latitude: number | null;
            notes: string | null;
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
        // Upload photo if provided and no avatar stored yet
        if (profileImageUrl) {
          const { data: existingFiles } = await client.storage
            .from("avatars")
            .list(user.id, { search: `${existingContact.id}.jpg`, limit: 1 });
          const hasAvatar = (existingFiles ?? []).some(
            (f) => f.name === `${existingContact!.id}.jpg`,
          );
          if (!hasAvatar) {
            await updateContactPhoto(client, existingContact.id, user.id, profileImageUrl);
          }
        }

        // Consolidate field updates into a single query
        const fieldUpdates: Record<string, any> = {};
        if (headline && !existingContact.headline) fieldUpdates.headline = headline;
        if (location && !existingContact.location) fieldUpdates.location = location;
        if (notes && !existingContact.notes) fieldUpdates.notes = notes;

        // Geocode the location if it's being set for the first time and no coordinates exist yet
        if (location && !existingContact.location && !existingContact.latitude) {
          try {
            const result = await cachedGeocodeLinkedInLocation(location);
            if (result) {
              const { geo, timezone: tz } = result;
              // Use the formatted mapy.com label as the canonical location value
              if (geo.formattedLabel) fieldUpdates.location = geo.formattedLabel;
              fieldUpdates.gis_point = geo.locationEwkt;

              if (tz) fieldUpdates.timezone = tz;
            }
          } catch (err) {
            request.log.error(
              { err },
              "[extension] Geocode failed for existing contact, continuing without coordinates",
            );
          }
        }

        if (Object.keys(fieldUpdates).length > 0) {
          await client.from("people").update(fieldUpdates).eq("id", existingContact.id);
        }

        // Upsert people_linkedin + replace work/education history if provided
        if (
          (workHistory && workHistory.length > 0) ||
          (educationHistory && educationHistory.length > 0) ||
          linkedinBio
        ) {
          const { data: linkedinRow, error: linkedinUpsertError } = await client
            .from("people_linkedin")
            .upsert(
              {
                user_id: user.id,
                person_id: existingContact.id,
                ...(linkedinBio ? { bio: linkedinBio } : {}),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id,person_id" },
            )
            .select("id")
            .single();

          if (linkedinUpsertError || !linkedinRow) {
            request.log.error(
              { err: linkedinUpsertError },
              "[extension] Failed to upsert people_linkedin for existing contact",
            );
          } else {
            // Upsert work history if provided (replace existing rows)
            if (workHistory && workHistory.length > 0) {
              await client
                .from("people_work_history")
                .delete()
                .eq("people_linkedin_id", linkedinRow.id)
                .eq("user_id", user.id);

              const rows = workHistory.map((entry: ScrapedWorkHistoryEntry) => ({
                user_id: user.id,
                people_linkedin_id: linkedinRow.id,
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
                request.log.error(
                  { err: whError },
                  "[extension] Failed to insert work history for existing contact",
                );
              }
            }

            // Upsert education history if provided (replace existing rows)
            if (educationHistory && educationHistory.length > 0) {
              await client
                .from("people_education_history")
                .delete()
                .eq("people_linkedin_id", linkedinRow.id)
                .eq("user_id", user.id);

              const rows = educationHistory.map((entry: ScrapedEducationEntry) => ({
                user_id: user.id,
                people_linkedin_id: linkedinRow.id,
                school_name: entry.schoolName,
                school_linkedin_id: entry.schoolLinkedinId ?? null,
                degree: entry.degree ?? null,
                description: entry.description ?? null,
                start_date: toPostgresDate(entry.startDate),
                end_date: toPostgresDate(entry.endDate),
              }));
              const { error: ehError } = await client.from("people_education_history").insert(rows);
              if (ehError) {
                request.log.error(
                  { err: ehError },
                  "[extension] Failed to insert education for existing contact",
                );
              }
            }
          }
        }

        return {
          contactId: existingContact.id,
          existed: true,
          firstName: existingContact.first_name ?? undefined,
          lastName: existingContact.last_name,
          avatar: buildContactAvatarUrl(client, user.id, existingContact.id),
        };
      }

      // Create new contact
      const insertData: any = {
        user_id: user.id,
        first_name: cleanPersonName(firstName) || primarySocial.handle || "Unknown",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const cleanedMiddleName = cleanPersonName(middleName);
      const cleanedLastName = cleanPersonName(lastName);
      if (cleanedMiddleName) insertData.middle_name = cleanedMiddleName;
      if (cleanedLastName) insertData.last_name = cleanedLastName;
      if (headline) insertData.headline = headline;
      if (location) insertData.location = location;
      if (notes) insertData.notes = notes;

      // Geocode the LinkedIn location string to get coordinates and structured address
      if (location) {
        try {
          const result = await cachedGeocodeLinkedInLocation(location);
          if (result) {
            const { geo, timezone: tz } = result;
            // Use the formatted mapy.com label as the canonical location value
            if (geo.formattedLabel) insertData.location = geo.formattedLabel;
            insertData.gis_point = geo.locationEwkt;

            if (tz) insertData.timezone = tz;
          }
        } catch (err) {
          request.log.error(
            { err },
            "[extension] Geocode failed for new contact, continuing without coordinates",
          );
        }
      }

      const { data: newContact, error: createError } = await client
        .from("people")
        .insert(insertData)
        .select("id")
        .single();

      if (createError || !newContact) {
        request.log.error({ err: createError }, "[extension] Failed to create contact");
        return reply.status(500).send({ error: "Failed to create contact" });
      }

      try {
        await upsertContactSocials(
          client,
          user.id,
          newContact.id,
          primarySocial.platform,
          primarySocial.handle,
        );
      } catch {
        return reply.status(500).send({ error: "Failed to save socials" });
      }

      const extensionGroup = resolveExtensionDefaultGroup(primarySocial.platform);
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

      // Insert LinkedIn data (bio + work/education) via people_linkedin
      if (
        (workHistory && workHistory.length > 0) ||
        (educationHistory && educationHistory.length > 0) ||
        linkedinBio
      ) {
        const { data: linkedinRow, error: linkedinInsertError } = await client
          .from("people_linkedin")
          .insert({
            user_id: user.id,
            person_id: newContact.id,
            bio: linkedinBio ?? null,
          })
          .select("id")
          .single();

        if (linkedinInsertError || !linkedinRow) {
          request.log.error(
            { err: linkedinInsertError },
            "[extension] Failed to insert people_linkedin for new contact",
          );
        } else {
          // Insert work history if provided
          if (workHistory && workHistory.length > 0) {
            request.log.info(
              { personId: newContact.id, count: workHistory.length },
              "[extension] Inserting work history for new contact",
            );
            const rows = workHistory.map((entry: ScrapedWorkHistoryEntry) => ({
              user_id: user.id,
              people_linkedin_id: linkedinRow.id,
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
              request.log.error({ err: whError }, "[extension] Failed to insert work history");
            }
          }

          // Insert education history if provided
          if (educationHistory && educationHistory.length > 0) {
            const rows = educationHistory.map((entry: ScrapedEducationEntry) => ({
              user_id: user.id,
              people_linkedin_id: linkedinRow.id,
              school_name: entry.schoolName,
              school_linkedin_id: entry.schoolLinkedinId ?? null,
              degree: entry.degree ?? null,
              description: entry.description ?? null,
              start_date: toPostgresDate(entry.startDate),
              end_date: toPostgresDate(entry.endDate),
            }));
            const { error: ehError } = await client.from("people_education_history").insert(rows);
            if (ehError) {
              request.log.error({ err: ehError }, "[extension] Failed to insert education");
            }
          }
        }
      }

      // Use logoMap to suppress unused variable warning; it is passed into uploadAllLinkedInLogos
      void logoMap;

      return { contactId: newContact.id, existed: false };
    },
  );
}
