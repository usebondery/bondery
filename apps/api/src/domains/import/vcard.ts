import { formatPlaceLabel } from "@bondery/helpers";
import type {
  TablesUpdate,
  VCardImportCommitResponse,
  VCardPreparedContact,
} from "@bondery/schemas";
import { uploadContactAvatarAndSetFlag } from "../../lib/contacts/avatar-storage.js";
import { createAdminClient } from "../../lib/data/supabase.js";
import { decodeDataUri } from "../../lib/import/decode-data-uri.js";
import { assignContactsToDefaultImportGroup } from "../../lib/import/default-groups.js";
import { validateImageMagicBytes, validateImageUpload } from "../../lib/platform/config.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import type { DomainContext } from "../_shared/context.js";
import { scheduleMergeRecommendationsRefresh } from "../contacts/merge-recommendations.js";

export async function commitVCardImport(
  ctx: DomainContext,
  rawImportContacts: VCardPreparedContact[],
): Promise<VCardImportCommitResponse> {
  const { client, user, log } = ctx;
  const contacts = rawImportContacts.filter((contact) => contact.isValid);
  const skippedCount = rawImportContacts.length - contacts.length;

  if (contacts.length === 0) {
    return {
      importedCount: 0,
      skippedCount,
    };
  }

  const now = new Date().toISOString();

  const { data: insertedPeople, error: insertError } = await client
    .from("people")
    .insert(
      contacts.map((c) => ({
        first_name: c.firstName,
        headline: c.headline,
        last_interaction: now,
        last_name: c.lastName,
        middle_name: c.middleName,
        myself: false,
        user_id: user.id,
      })),
    )
    .select("id");

  if (insertError || !insertedPeople) {
    throw internal("import_vcard_failed", insertError?.message ?? "Insert failed");
  }

  const importedCount = insertedPeople.length;
  const personIds = insertedPeople.map((person) => person.id);

  const contactPersonPairs = contacts.map((contact, index) => ({
    contact,
    personId: personIds[index],
  }));

  const phoneRows = contactPersonPairs.flatMap(({ contact, personId }) =>
    contact.phones.map((phone, sortOrder) => ({
      person_id: personId,
      preferred: phone.preferred,
      prefix: phone.prefix,
      sort_order: sortOrder,
      type: phone.type,
      user_id: user.id,
      value: phone.value,
    })),
  );

  if (phoneRows.length > 0) {
    const { error: phoneError } = await client.from("people_phones").insert(phoneRows);
    if (phoneError) {
      log?.error({ err: phoneError }, "Failed to insert phones during vCard import");
    }
  }

  const emailRows = contactPersonPairs.flatMap(({ contact, personId }) =>
    contact.emails.map((email, sortOrder) => ({
      person_id: personId,
      preferred: email.preferred,
      sort_order: sortOrder,
      type: email.type,
      user_id: user.id,
      value: email.value,
    })),
  );

  if (emailRows.length > 0) {
    const { error: emailError } = await client.from("people_emails").insert(emailRows);
    if (emailError) {
      log?.error({ err: emailError }, "Failed to insert emails during vCard import");
    }
  }

  const addressRows = contactPersonPairs.flatMap(({ contact, personId }) => {
    const valid = contact.addresses.filter((addr) => addr.validity === "valid");
    const sorted = [...valid.filter((a) => a.preferred), ...valid.filter((a) => !a.preferred)];
    return sorted.map((address, sortOrder) => ({
      address_city: address.addressCity,
      address_country: address.addressCountry,
      address_country_code: address.addressCountryCode,
      address_formatted: address.addressFormatted,
      address_geocode_source: address.geocodeSource,
      address_granularity: address.addressLine1 ? "address" : "city",
      address_line1: address.addressLine1,
      address_line2: address.addressLine2,
      address_postal_code: address.addressPostalCode,
      address_state: address.addressState,
      address_state_code: address.addressStateCode,
      geocode_confidence: address.validity === "valid" ? "verified" : "unverifiable",
      label: null,
      latitude: address.latitude,
      longitude: address.longitude,
      person_id: personId,
      sort_order: sortOrder,
      timezone: address.timezone,
      type: address.type,
      user_id: user.id,
      value: address.value,
    }));
  });

  if (addressRows.length > 0) {
    const { error: addressError } = await client.from("people_addresses").insert(addressRows);
    if (addressError) {
      log?.error({ err: addressError }, "Failed to insert addresses during vCard import");
    }
  }

  await Promise.allSettled(
    contactPersonPairs.map(async ({ contact, personId }) => {
      try {
        const validAddresses = contact.addresses.filter(
          (a) => a.validity === "valid" && a.latitude && a.longitude,
        );
        const picked =
          validAddresses.find((a) => a.preferred) ??
          validAddresses.find((a) => a.type === "home") ??
          validAddresses[0];

        if (!picked) {
          return;
        }

        const locationLabel =
          formatPlaceLabel({
            city: picked.addressCity ?? undefined,
            countryCode: picked.addressCountryCode ?? undefined,
            state: picked.addressState ?? undefined,
          }) ||
          picked.addressCity ||
          picked.value;

        const fieldUpdates: TablesUpdate<"people"> = {
          gis_point: `SRID=4326;POINT(${picked.longitude} ${picked.latitude})`,
          location: locationLabel,
          updated_at: new Date().toISOString(),
        };
        if (picked.timezone) {
          fieldUpdates.timezone = picked.timezone;
        }

        await client.from("people").update(fieldUpdates).eq("id", personId);
      } catch (err) {
        log?.error(
          { err, personId },
          "Failed to sync preferred address to person during vCard import",
        );
      }
    }),
  );

  const socialRows: Array<{
    user_id: string;
    person_id: string;
    platform: string;
    handle: string;
  }> = [];

  for (const { contact, personId } of contactPersonPairs) {
    if (contact.linkedin) {
      socialRows.push({
        handle: contact.linkedin,
        person_id: personId,
        platform: "linkedin",
        user_id: user.id,
      });
    }
    if (contact.instagram) {
      socialRows.push({
        handle: contact.instagram,
        person_id: personId,
        platform: "instagram",
        user_id: user.id,
      });
    }
    if (contact.whatsapp) {
      socialRows.push({
        handle: contact.whatsapp,
        person_id: personId,
        platform: "whatsapp",
        user_id: user.id,
      });
    }
    if (contact.facebook) {
      socialRows.push({
        handle: contact.facebook,
        person_id: personId,
        platform: "facebook",
        user_id: user.id,
      });
    }
    if (contact.signal) {
      socialRows.push({
        handle: contact.signal,
        person_id: personId,
        platform: "signal",
        user_id: user.id,
      });
    }
    if (contact.website) {
      socialRows.push({
        handle: contact.website,
        person_id: personId,
        platform: "website",
        user_id: user.id,
      });
    }
  }

  if (socialRows.length > 0) {
    const { error: socialError } = await client
      .from("people_socials")
      .upsert(socialRows, { onConflict: "user_id,person_id,platform" });

    if (socialError) {
      log?.error({ err: socialError }, "Failed to upsert social media during vCard import");
    }
  }

  const avatarUploads = contactPersonPairs
    .filter(({ contact }) => contact.avatarUri)
    .map(async ({ contact, personId }) => {
      const avatarUri = contact.avatarUri;
      if (!avatarUri) {
        return;
      }

      try {
        let buffer: Buffer;
        let contentType: string;

        if (avatarUri.startsWith("data:")) {
          const decoded = decodeDataUri(avatarUri);
          if (!decoded) {
            return;
          }
          buffer = decoded.buffer;
          contentType = decoded.contentType;
        } else if (avatarUri.startsWith("http")) {
          const response = await fetch(avatarUri);
          if (!response.ok) {
            return;
          }
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
          contentType = blob.type;
        } else {
          return;
        }

        const validation = validateImageUpload({
          size: buffer.length,
          type: contentType,
        });
        if (!validation.isValid) {
          return;
        }

        if (!validateImageMagicBytes(buffer)) {
          return;
        }

        const adminClient = createAdminClient();
        await uploadContactAvatarAndSetFlag(
          client,
          adminClient,
          user.id,
          personId,
          buffer,
          contentType,
        );
      } catch (error) {
        log?.error({ err: error, personId }, "Failed to upload vCard avatar");
      }
    });

  await Promise.allSettled(avatarUploads);

  const dateRows = contactPersonPairs.flatMap(({ contact, personId }) =>
    (contact.importantDates || []).map((event) => ({
      date: event.date,
      note: event.note,
      notify_days_before: null,
      person_id: personId,
      type: event.type,
      user_id: user.id,
    })),
  );

  if (dateRows.length > 0) {
    const { error: datesError } = await client.from("people_important_dates").insert(dateRows);
    if (datesError) {
      log?.error({ err: datesError }, "Failed to insert dates during vCard import");
    }
  }

  try {
    await assignContactsToDefaultImportGroup(client, user.id, "vcard_import", personIds);
  } catch (groupError) {
    const message =
      groupError instanceof Error ? groupError.message : "Failed to assign imported contacts";
    throw internal("import_vcard_failed", message);
  }

  if (importedCount > 0) {
    scheduleMergeRecommendationsRefresh(ctx);
  }

  return {
    importedCount,
    skippedCount,
  };
}
