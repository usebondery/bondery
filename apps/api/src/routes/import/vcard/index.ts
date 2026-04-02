import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Type } from "@sinclair/typebox";
import { getAuth } from "../../../lib/auth.js";
import { parseVCardUpload } from "./parser.js";
import { assignContactsToDefaultImportGroup } from "../../../lib/default-import-groups.js";
import { validateImageUpload, validateImageMagicBytes } from "../../../lib/config.js";
import type { VCardImportCommitResponse, VCardParseResponse } from "@bondery/types";
import logger from "../../../lib/logger.js";
import { formatPlaceLabel } from "@bondery/helpers";

const VCardCommitPhoneSchema = Type.Object({
  prefix: Type.String(),
  value: Type.String(),
  type: Type.Union([Type.Literal("home"), Type.Literal("work")]),
  preferred: Type.Boolean(),
});

const VCardCommitEmailSchema = Type.Object({
  value: Type.String(),
  type: Type.Union([Type.Literal("home"), Type.Literal("work")]),
  preferred: Type.Boolean(),
});

const VCardCommitAddressSchema = Type.Object({
  value: Type.String(),
  type: Type.Union([Type.Literal("home"), Type.Literal("work"), Type.Literal("other")]),
  preferred: Type.Boolean(),
  addressLine1: Type.Union([Type.String(), Type.Null()]),
  addressLine2: Type.Union([Type.String(), Type.Null()]),
  addressCity: Type.Union([Type.String(), Type.Null()]),
  addressPostalCode: Type.Union([Type.String(), Type.Null()]),
  addressState: Type.Union([Type.String(), Type.Null()]),
  addressStateCode: Type.Union([Type.String(), Type.Null()]),
  addressCountry: Type.Union([Type.String(), Type.Null()]),
  addressCountryCode: Type.Union([Type.String(), Type.Null()]),
  addressFormatted: Type.Union([Type.String(), Type.Null()]),
  latitude: Type.Union([Type.Number(), Type.Null()]),
  longitude: Type.Union([Type.Number(), Type.Null()]),
  geocodeSource: Type.Union([Type.Literal("mapy.com"), Type.Null()]),
  validity: Type.Union([
    Type.Literal("valid"),
    Type.Literal("unverifiable"),
    Type.Literal("invalid"),
  ]),
  timezone: Type.Union([Type.String(), Type.Null()]),
});

const VCardCommitImportantDateSchema = Type.Object({
  type: Type.Union([
    Type.Literal("birthday"),
    Type.Literal("anniversary"),
    Type.Literal("nameday"),
    Type.Literal("graduation"),
    Type.Literal("other"),
  ]),
  date: Type.String(),
  note: Type.Union([Type.String(), Type.Null()]),
});

const VCardCommitContactSchema = Type.Object({
  tempId: Type.String(),
  firstName: Type.String(),
  middleName: Type.Union([Type.String(), Type.Null()]),
  lastName: Type.String(),
  headline: Type.Union([Type.String(), Type.Null()]),
  phones: Type.Array(VCardCommitPhoneSchema),
  emails: Type.Array(VCardCommitEmailSchema),
  addresses: Type.Array(VCardCommitAddressSchema),
  linkedin: Type.Union([Type.String(), Type.Null()]),
  instagram: Type.Union([Type.String(), Type.Null()]),
  whatsapp: Type.Union([Type.String(), Type.Null()]),
  facebook: Type.Union([Type.String(), Type.Null()]),
  signal: Type.Union([Type.String(), Type.Null()]),
  website: Type.Union([Type.String(), Type.Null()]),
  avatarUri: Type.Union([Type.String(), Type.Null()]),
  importantDates: Type.Union([Type.Array(VCardCommitImportantDateSchema), Type.Null()]),
  isValid: Type.Boolean(),
});

const VCardCommitBody = Type.Object({
  contacts: Type.Array(VCardCommitContactSchema, { minItems: 1 }),
});

const AVATARS_BUCKET = "avatars";

/**
 * Decodes a data URI (e.g. from an embedded vCard photo) into a buffer and media type.
 *
 * @returns Buffer + contentType, or null if the URI is not a valid data URI.
 */
function decodeDataUri(uri: string): { buffer: Buffer; contentType: string } | null {
  const match = uri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  const contentType = match[1];
  const base64 = match[2];

  try {
    const buffer = Buffer.from(base64, "base64");
    return { buffer, contentType };
  } catch {
    return null;
  }
}

export async function vcardImportRoutes(fastify: FastifyInstance) {
  fastify.addHook("onRoute", (routeOptions) => {
    routeOptions.schema = { ...routeOptions.schema, tags: ["Import"] };
  });
  fastify.addHook("onRequest", fastify.auth([fastify.verifySession]));

  fastify.post("/parse", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const files: Array<{ fileName: string; content: Buffer }> = [];

      for await (const part of request.parts()) {
        if (part.type !== "file") {
          continue;
        }

        const content = await part.toBuffer();
        if (!content || !part.filename) {
          continue;
        }

        files.push({
          fileName: part.filename,
          content,
        });
      }

      const contacts = await parseVCardUpload(files);

      const response: VCardParseResponse = {
        contacts,
        totalCount: contacts.length,
        validCount: contacts.filter((item) => item.isValid).length,
        invalidCount: contacts.filter((item) => !item.isValid).length,
      };

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse vCard file";
      return reply.status(400).send({ error: message });
    }
  });

  fastify.post(
    "/commit",
    { schema: { body: VCardCommitBody } },
    async (
      request: FastifyRequest<{ Body: typeof VCardCommitBody.static }>,
      reply: FastifyReply,
    ) => {
      const { client, user } = getAuth(request);
      const rawContacts = request.body.contacts;

      // Drop invalid rows up-front.
      const contacts = rawContacts.filter((contact) => contact.isValid);
      const skippedCount = rawContacts.length - contacts.length;

      if (contacts.length === 0) {
        return { importedCount: 0, skippedCount } satisfies VCardImportCommitResponse;
      }

      const now = new Date().toISOString();

      // ── Step 1: Bulk insert people ──────────────────────────────────────────
      const { data: insertedPeople, error: insertError } = await client
        .from("people")
        .insert(
          contacts.map((c) => ({
            user_id: user.id,
            first_name: c.firstName,
            middle_name: c.middleName,
            last_name: c.lastName,
            headline: c.headline,
            myself: false,
            last_interaction: now,
          })),
        )
        .select("id");

      if (insertError || !insertedPeople) {
        return reply.status(500).send({ error: insertError?.message ?? "Insert failed" });
      }

      const importedCount = insertedPeople.length;
      const personIds = insertedPeople.map((person) => person.id);

      // Map each inserted person back to the original contact by index.
      const contactPersonPairs = contacts.map((contact, index) => ({
        contact,
        personId: personIds[index],
      }));

      // ── Step 2: Bulk insert phones ──────────────────────────────────────────
      const phoneRows = contactPersonPairs.flatMap(({ contact, personId }) =>
        contact.phones.map((phone, sortOrder) => ({
          user_id: user.id,
          person_id: personId,
          prefix: phone.prefix,
          value: phone.value,
          type: phone.type,
          preferred: phone.preferred,
          sort_order: sortOrder,
        })),
      );

      if (phoneRows.length > 0) {
        const { error: phoneError } = await client.from("people_phones").insert(phoneRows);
        if (phoneError) {
          logger.error({ err: phoneError }, "Failed to insert phones during vCard import");
        }
      }

      // ── Step 3: Bulk insert emails ──────────────────────────────────────────
      const emailRows = contactPersonPairs.flatMap(({ contact, personId }) =>
        contact.emails.map((email, sortOrder) => ({
          user_id: user.id,
          person_id: personId,
          value: email.value,
          type: email.type,
          preferred: email.preferred,
          sort_order: sortOrder,
        })),
      );

      if (emailRows.length > 0) {
        const { error: emailError } = await client.from("people_emails").insert(emailRows);
        if (emailError) {
          logger.error({ err: emailError }, "Failed to insert emails during vCard import");
        }
      }

      // ── Step 4: Bulk insert addresses ───────────────────────────────────────
      // Only addresses confirmed by the street geocoder (validity = "valid") are saved.
      // Unverified addresses (city-only, geocoder miss) are discarded to avoid storing
      // incorrect location data.
      // All enriched fields (state code, country code, formatted, timezone) are
      // already resolved — no geocoding needed here.
      // The preferred address (vCard pref flag) is placed first (sort_order = 0).
      const addressRows = contactPersonPairs.flatMap(({ contact, personId }) => {
        const valid = contact.addresses.filter((addr) => addr.validity === "valid");
        // Sort preferred first so sort_order = 0 is the preferred address.
        const sorted = [...valid.filter((a) => a.preferred), ...valid.filter((a) => !a.preferred)];
        return sorted.map((address, sortOrder) => ({
          user_id: user.id,
          person_id: personId,
          type: address.type,
          label: null,
          value: address.value,
          latitude: address.latitude,
          longitude: address.longitude,
          address_line1: address.addressLine1,
          address_line2: address.addressLine2,
          address_city: address.addressCity,
          address_postal_code: address.addressPostalCode,
          address_state: address.addressState,
          address_state_code: address.addressStateCode,
          address_country: address.addressCountry,
          address_country_code: address.addressCountryCode,
          address_formatted: address.addressFormatted,
          // "address" when we have a street (full address data), "city" when city-level only.
          // Geocode precision is captured separately in geocode_confidence.
          address_granularity: address.addressLine1 ? "address" : "city",
          address_geocode_source: address.geocodeSource,
          geocode_confidence: address.validity === "valid" ? "verified" : "unverifiable",
          timezone: address.timezone,
          sort_order: sortOrder,
        }));
      });

      if (addressRows.length > 0) {
        const { error: addressError } = await client.from("people_addresses").insert(addressRows);
        if (addressError) {
          logger.error({ err: addressError }, "Failed to insert addresses during vCard import");
        }
      }

      // ── Step 4.5: Sync preferred address location to person ─────────────────
      // sort_order = 0 is the preferred address. Sync only location, gis_point, timezone
      // to people — the address detail lives in people_addresses.
      await Promise.allSettled(
        contactPersonPairs.map(async ({ contact, personId }) => {
          try {
            const validAddresses = contact.addresses.filter(
              (a) => a.validity === "valid" && a.latitude && a.longitude,
            );
            // Preferred order: vCard pref flag → home type → first available.
            const picked =
              validAddresses.find((a) => a.preferred) ??
              validAddresses.find((a) => a.type === "home") ??
              validAddresses[0];

            if (!picked) return;

            // Location on the person record uses city/region/country format (LinkedIn-style).
            const locationLabel =
              formatPlaceLabel({
                city: picked.addressCity ?? undefined,
                state: picked.addressState ?? undefined,
                countryCode: picked.addressCountryCode ?? undefined,
              }) ||
              picked.addressCity ||
              picked.value;

            const fieldUpdates: Record<string, unknown> = {
              location: locationLabel,
              gis_point: `SRID=4326;POINT(${picked.longitude} ${picked.latitude})`,
              updated_at: new Date().toISOString(),
            };
            if (picked.timezone) fieldUpdates.timezone = picked.timezone;

            await client.from("people").update(fieldUpdates).eq("id", personId);
          } catch (err) {
            logger.error(
              { err, personId },
              "Failed to sync preferred address to person during vCard import",
            );
          }
        }),
      );

      // ── Step 5: Bulk upsert social media rows ──────────────────────────────
      const socialRows: Array<{
        user_id: string;
        person_id: string;
        platform: string;
        handle: string;
      }> = [];

      for (const { contact, personId } of contactPersonPairs) {
        if (contact.linkedin) {
          socialRows.push({
            user_id: user.id,
            person_id: personId,
            platform: "linkedin",
            handle: contact.linkedin,
          });
        }
        if (contact.instagram) {
          socialRows.push({
            user_id: user.id,
            person_id: personId,
            platform: "instagram",
            handle: contact.instagram,
          });
        }
        if (contact.whatsapp) {
          socialRows.push({
            user_id: user.id,
            person_id: personId,
            platform: "whatsapp",
            handle: contact.whatsapp,
          });
        }
        if (contact.facebook) {
          socialRows.push({
            user_id: user.id,
            person_id: personId,
            platform: "facebook",
            handle: contact.facebook,
          });
        }
        if (contact.signal) {
          socialRows.push({
            user_id: user.id,
            person_id: personId,
            platform: "signal",
            handle: contact.signal,
          });
        }
        if (contact.website) {
          socialRows.push({
            user_id: user.id,
            person_id: personId,
            platform: "website",
            handle: contact.website,
          });
        }
      }

      if (socialRows.length > 0) {
        const { error: socialError } = await client
          .from("people_socials")
          .upsert(socialRows, { onConflict: "user_id,person_id,platform" });

        if (socialError) {
          logger.error({ err: socialError }, "Failed to upsert social media during vCard import");
        }
      }

      // ── Step 6: Upload embedded photos as avatars ───────────────────────────
      const avatarUploads = contactPersonPairs
        .filter(({ contact }) => contact.avatarUri)
        .map(async ({ contact, personId }) => {
          try {
            let buffer: Buffer;
            let contentType: string;

            if (contact.avatarUri!.startsWith("data:")) {
              const decoded = decodeDataUri(contact.avatarUri!);
              if (!decoded) return;
              buffer = decoded.buffer;
              contentType = decoded.contentType;
            } else if (contact.avatarUri!.startsWith("http")) {
              const response = await fetch(contact.avatarUri!);
              if (!response.ok) return;
              const blob = await response.blob();
              const arrayBuffer = await blob.arrayBuffer();
              buffer = Buffer.from(arrayBuffer);
              contentType = blob.type;
            } else {
              return;
            }

            const validation = validateImageUpload({ type: contentType, size: buffer.length });
            if (!validation.isValid) return;

            if (!validateImageMagicBytes(buffer)) return;

            const fileName = `${user.id}/${personId}.jpg`;
            await client.storage.from(AVATARS_BUCKET).upload(fileName, buffer, {
              contentType,
              upsert: true,
            });
          } catch (error) {
            logger.error({ err: error, personId }, "Failed to upload vCard avatar");
          }
        });

      // Fire avatar uploads concurrently — don't block the response on slow uploads.
      await Promise.allSettled(avatarUploads);

      // ── Step 7: Insert important dates into people_important_dates ──────────
      const dateRows = contactPersonPairs.flatMap(({ contact, personId }) =>
        (contact.importantDates || []).map((event) => ({
          user_id: user.id,
          person_id: personId,
          type: event.type,
          date: event.date,
          note: event.note,
          notify_days_before: null, // Default: do not notify
        })),
      );

      if (dateRows.length > 0) {
        const { error: datesError } = await client.from("people_important_dates").insert(dateRows);

        if (datesError) {
          logger.error({ err: datesError }, "Failed to insert dates during vCard import");
        }
      }

      // ── Step 8: Assign to default import group ──────────────────────────────
      try {
        await assignContactsToDefaultImportGroup(client, user.id, "vcard_import", personIds);
      } catch (groupError) {
        const message =
          groupError instanceof Error ? groupError.message : "Failed to assign imported contacts";
        return reply.status(500).send({ error: message });
      }

      const response: VCardImportCommitResponse = {
        importedCount,
        skippedCount,
      };

      return response;
    },
  );
}
