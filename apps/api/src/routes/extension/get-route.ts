/**
 * Extension GET route - Browser redirect endpoint (creates contact and redirects to app)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createAuthenticatedClient } from "../../lib/supabase.js";
import { API_ROUTES, WEBAPP_ROUTES } from "@bondery/helpers";
import { findPersonIdBySocial, upsertContactSocials } from "../../lib/socials.js";
import { cleanPersonName } from "@bondery/helpers/name-utils";
import { assignContactsToDefaultImportGroup } from "../../lib/default-import-groups.js";
import { cachedGeocodeLinkedInLocation } from "../../lib/mapy.js";
import { updateContactPhoto } from "../../lib/linkedin-helpers.js";
import { URLS } from "../../lib/config.js";
import { RedirectQuery, resolvePrimarySocial, resolveExtensionDefaultGroup } from "./helpers.js";

export function registerGetRoute(fastify: FastifyInstance): void {
  /**
   * GET /api/redirect - Browser redirect endpoint (creates contact and redirects to app)
   */
  fastify.get(
    "/",
    { schema: { querystring: RedirectQuery } },
    async (
      request: FastifyRequest<{ Querystring: typeof RedirectQuery.static }>,
      reply: FastifyReply,
    ) => {
      const query = request.query;
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
      } = query;

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

      const { client, user } = await createAuthenticatedClient(request);

      if (!user) {
        // Redirect to login with return URL
        const searchParams = new URLSearchParams(query as Record<string, string>);
        const returnUrl = `${API_ROUTES.EXTENSION}?${searchParams.toString()}`;
        return reply.redirect(
          `${URLS.webapp}${URLS.login}?returnUrl=${encodeURIComponent(returnUrl)}`,
        );
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
        headline: string | null;
        location: string | null;
        latitude: number | null;
      } | null = null;

      if (existingContactId) {
        const { data: contactData, error: lookupError } = await client
          .from("people")
          .select("id, headline, location, latitude")
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

        // Geocode the location if it's being set for the first time and no coordinates exist yet
        if (location && !existingContact.location && !existingContact.latitude) {
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
              "[extension] Geocode failed for existing contact (GET), continuing without coordinates",
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

      // Geocode the LinkedIn location string to get coordinates and structured address
      if (location) {
        try {
          const result = await cachedGeocodeLinkedInLocation(location);
          if (result) {
            const { geo, timezone: tz } = result;
            if (geo.formattedLabel) insertData.location = geo.formattedLabel;
            insertData.gis_point = geo.locationEwkt;

            if (tz) insertData.timezone = tz;
          }
        } catch (err) {
          request.log.error(
            { err },
            "[extension] Geocode failed for new contact (GET), continuing without coordinates",
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

      if (profileImageUrl) {
        await updateContactPhoto(client, newContact.id, user.id, profileImageUrl);
      }

      return reply.redirect(`${URLS.webapp}${WEBAPP_ROUTES.PERSON}/${newContact.id}`);
    },
  );
}
