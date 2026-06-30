/**
 * Contacts — Enrich Route
 * Updates a contact with scraped LinkedIn data (name, bio, work history, education, avatar).
 */

import type { FastifyReply } from "fastify";
import type { AppFastifyInstance } from "../../../lib/fastify-types.js";
import type { FastifyZodOpenApiSchema } from "fastify-zod-openapi";
import { getAuth } from "../../../lib/auth.js";
import { withOkResponse } from "../../../lib/openapi-route-responses.js";
import {
  toPostgresDate,
  updateContactPhoto,
  uploadAllLinkedInLogos,
} from "../../../lib/linkedin-helpers.js";
import { cleanPersonName } from "@bondery/helpers/name";
import type { TablesUpdate } from "@bondery/schemas";
import { cachedGeocodeLinkedInLocation } from "../../../lib/mapy.js";
import type {
  ScrapedWorkHistoryEntry,
  ScrapedEducationEntry,
} from "@bondery/schemas";
import { apiSuccessResponseSchema, enrichContactRequestSchema } from "@bondery/schemas";
import { uuidParamSchema } from "@bondery/schemas/http";
import { ENRICH_TIER } from "../../../lib/rate-limit.js";

export function registerEnrichRoutes(fastify: AppFastifyInstance): void {
  /**
   * POST /api/contacts/:id/enrich - Update a contact with scraped LinkedIn data.
   *
   * Work history, education, bio, name, avatar, and location are **overwritten**
   * so the user can intentionally refresh stale data.  Headline is only filled
   * when the contact doesn't already have it (fill-if-missing).
   */
  fastify.post(
    "/:id/enrich",
    {
      schema: {
        description: "Update a contact with scraped LinkedIn profile data.",
        params: uuidParamSchema,
        body: enrichContactRequestSchema,
        response: withOkResponse(apiSuccessResponseSchema, "Contact enriched"),
      } satisfies FastifyZodOpenApiSchema,
      config: { rateLimit: ENRICH_TIER },
    },
    async (request, reply) => {
      const { client, user } = getAuth(request);
      const { id: personId } = request.params;
      const {
        firstName,
        middleName,
        lastName,
        profileImageUrl,
        headline,
        location,
        linkedinBio,
        workHistory,
        educationHistory,
      } = request.body;

      request.log.info(
        {
          personId,
          userId: user.id,
          workHistoryCount: workHistory?.length ?? 0,
          educationCount: educationHistory?.length ?? 0,
        },
        "[enrich] POST received",
      );

      // Verify the person belongs to the authenticated user & fetch current values
      // (needed for fill-if-missing logic on headline, location)
      const { data: person, error: personError } = await client
        .from("people")
        .select("id, headline, location")
        .eq("id", personId)
        .eq("user_id", user.id)
        .single();

      if (personError || !person) {
        return reply.status(404).send({ error: "Contact not found" });
      }

      // Upload logos in parallel (used when inserting work/edu rows)
      await uploadAllLinkedInLogos(
        client,
        user.id,
        workHistory,
        educationHistory,
      );

      // Always (re-)upload the contact photo so enrichment refreshes stale avatars.
      if (profileImageUrl) {
        await updateContactPhoto(client, personId, user.id, profileImageUrl);
      }

      // Force-update scalar fields (name always overwrites)
      const fieldUpdates: TablesUpdate<"people"> = {};

      // Bump updated_at when a new photo is uploaded so the avatar URL
      // cache-buster (appended ?t= timestamp) changes and browsers/CDN
      // serve the fresh image even when no scalar fields changed.
      if (profileImageUrl) {
        fieldUpdates.updated_at = new Date().toISOString();
      }
      if (firstName !== undefined)
        fieldUpdates.first_name = cleanPersonName(firstName) || undefined;
      if (middleName !== undefined)
        fieldUpdates.middle_name = cleanPersonName(middleName) || null;
      if (lastName !== undefined)
        fieldUpdates.last_name = cleanPersonName(lastName) || null;

      // Fill-if-missing: headline
      if (headline && !person.headline) {
        fieldUpdates.headline = headline;
      }

      // Always geocode & overwrite location so the user gets fresh coordinates on re-enrich
      if (location) {
        fieldUpdates.location = location;
        try {
          const result = await cachedGeocodeLinkedInLocation(location);
          if (result) {
            const { geo, timezone: tz } = result;
            if (geo.formattedLabel) fieldUpdates.location = geo.formattedLabel;
            fieldUpdates.gis_point = geo.locationEwkt;
            if (tz) fieldUpdates.timezone = tz;
          }
        } catch (err) {
          request.log.error(
            { err },
            "[enrich] Geocode failed, continuing without coordinates",
          );
        }
      }

      if (Object.keys(fieldUpdates).length > 0) {
        fieldUpdates.updated_at = new Date().toISOString();
        await client.from("people").update(fieldUpdates).eq("id", personId);
      }

      // Upsert people_linkedin row (bio + sync timestamp)
      const { data: linkedinRow, error: linkedinUpsertError } = await client
        .from("people_linkedin")
        .upsert(
          {
            user_id: user.id,
            person_id: personId,
            bio: linkedinBio ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,person_id" },
        )
        .select("id")
        .single();

      if (linkedinUpsertError || !linkedinRow) {
        request.log.error(
          { linkedinUpsertError },
          "[enrich] Failed to upsert people_linkedin",
        );
        return reply
          .status(500)
          .send({ error: "Failed to save LinkedIn profile data" });
      }

      const peopleLinkedinId = linkedinRow.id;

      // Replace work history atomically (delete + insert in one transaction)
      if (workHistory && workHistory.length > 0) {
        const rows = workHistory.map((entry: ScrapedWorkHistoryEntry) => ({
          company_name: entry.companyName,
          company_linkedin_id: entry.companyLinkedinId ?? null,
          title: entry.title ?? null,
          description: entry.description ?? null,
          start_date: toPostgresDate(entry.startDate),
          end_date: toPostgresDate(entry.endDate),
          employment_type: entry.employmentType ?? null,
          location: entry.location ?? null,
        }));
        const { error: whError } = await client.rpc("replace_work_history", {
          p_people_linkedin_id: peopleLinkedinId,
          p_user_id: user.id,
          p_rows: rows,
        });
        if (whError) {
          request.log.error(
            { whError },
            "[enrich] Failed to replace work history",
          );
        }
      }

      // Replace education history atomically (delete + insert in one transaction)
      if (educationHistory && educationHistory.length > 0) {
        const rows = educationHistory.map((entry: ScrapedEducationEntry) => ({
          school_name: entry.schoolName,
          school_linkedin_id: entry.schoolLinkedinId ?? null,
          degree: entry.degree ?? null,
          description: entry.description ?? null,
          start_date: toPostgresDate(entry.startDate),
          end_date: toPostgresDate(entry.endDate),
        }));
        const { error: ehError } = await client.rpc(
          "replace_education_history",
          {
            p_people_linkedin_id: peopleLinkedinId,
            p_user_id: user.id,
            p_rows: rows,
          },
        );
        if (ehError) {
          request.log.error(
            { ehError },
            "[enrich] Failed to replace education history",
          );
        }
      }

      request.log.info({ personId }, "[enrich] Enrichment complete");
      return reply.status(200).send({ success: true });
    },
  );
}
