import { formatPlaceLabel } from "@bondery/helpers";
import type { VCardImportCommitResponse, VCardPreparedContact } from "@bondery/schemas";
import { uploadContactAvatarAndSetFlag } from "../../lib/contacts/avatar-storage.js";
import { decodeDataUri } from "../../lib/import/decode-data-uri.js";
import { assignContactsToDefaultImportGroup } from "../../lib/import/default-groups.js";
import { validateImageMagicBytes, validateImageUpload } from "../../lib/platform/config.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import type { DomainContext } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";
import { scheduleMergeRecommendationsRefresh } from "../contacts/merge-recommendations.js";

export async function commitVCardImport(
  ctx: DomainContext,
  rawImportContacts: VCardPreparedContact[],
): Promise<VCardImportCommitResponse> {
  const { user, log } = ctx;
  const db = domainDb(ctx);
  const contacts = rawImportContacts.filter((contact) => contact.isValid);
  const skippedCount = rawImportContacts.length - contacts.length;

  if (contacts.length === 0) {
    return {
      importedCount: 0,
      skippedCount,
    };
  }

  const now = new Date();

  let insertedPeople: Array<{ id: string }>;
  try {
    insertedPeople = await db.people.createManyAndReturn({
      data: contacts.map((contact) => ({
        firstName: contact.firstName,
        headline: contact.headline,
        lastInteraction: now,
        lastName: contact.lastName,
        middleName: contact.middleName,
        myself: false,
        userId: user.id,
      })),
      select: { id: true },
    });
  } catch (error) {
    throw internal("import_vcard_failed", error instanceof Error ? error.message : "Insert failed");
  }

  const importedCount = insertedPeople.length;
  const personIds = insertedPeople.map((person) => person.id);

  const contactPersonPairs = contacts.map((contact, index) => ({
    contact,
    personId: personIds[index],
  }));

  const phoneRows = contactPersonPairs.flatMap(({ contact, personId }) =>
    contact.phones.map((phone, sortOrder) => ({
      personId,
      preferred: phone.preferred,
      prefix: phone.prefix,
      sortOrder,
      type: phone.type,
      userId: user.id,
      value: phone.value,
    })),
  );

  if (phoneRows.length > 0) {
    try {
      await db.peoplePhone.createMany({ data: phoneRows });
    } catch (error) {
      log?.error({ err: error }, "Failed to insert phones during vCard import");
    }
  }

  const emailRows = contactPersonPairs.flatMap(({ contact, personId }) =>
    contact.emails.map((email, sortOrder) => ({
      personId,
      preferred: email.preferred,
      sortOrder,
      type: email.type,
      userId: user.id,
      value: email.value,
    })),
  );

  if (emailRows.length > 0) {
    try {
      await db.peopleEmail.createMany({ data: emailRows });
    } catch (error) {
      log?.error({ err: error }, "Failed to insert emails during vCard import");
    }
  }

  const addressRows = contactPersonPairs.flatMap(({ contact, personId }) => {
    const valid = contact.addresses.filter((address) => address.validity === "valid");
    const sorted = [
      ...valid.filter((address) => address.preferred),
      ...valid.filter((address) => !address.preferred),
    ];
    return sorted.map((address, sortOrder) => ({
      addressCity: address.addressCity,
      addressCountry: address.addressCountry,
      addressCountryCode: address.addressCountryCode,
      addressFormatted: address.addressFormatted,
      addressGeocodeSource: address.geocodeSource,
      addressGranularity: address.addressLine1 ? "address" : "city",
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      addressPostalCode: address.addressPostalCode,
      addressState: address.addressState,
      addressStateCode: address.addressStateCode,
      geocodeConfidence: address.validity === "valid" ? "verified" : "unverifiable",
      label: null,
      latitude: address.latitude,
      longitude: address.longitude,
      personId,
      sortOrder,
      timezone: address.timezone,
      type: address.type,
      userId: user.id,
      value: address.value,
    }));
  });

  if (addressRows.length > 0) {
    try {
      await db.peopleAddress.createMany({ data: addressRows });
    } catch (error) {
      log?.error({ err: error }, "Failed to insert addresses during vCard import");
    }
  }

  await Promise.allSettled(
    contactPersonPairs.map(async ({ contact, personId }) => {
      try {
        const validAddresses = contact.addresses.filter(
          (address) => address.validity === "valid" && address.latitude && address.longitude,
        );
        const picked =
          validAddresses.find((address) => address.preferred) ??
          validAddresses.find((address) => address.type === "home") ??
          validAddresses[0];

        if (!picked || picked.latitude == null || picked.longitude == null) {
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

        const ewkt = `SRID=4326;POINT(${picked.longitude} ${picked.latitude})`;

        if (picked.timezone) {
          await db.$executeRaw`
            UPDATE people
            SET "gisPoint" = ST_GeogFromText(${ewkt}),
                location = ${locationLabel},
                timezone = ${picked.timezone},
                updated_at = NOW()
            WHERE id = ${personId}::uuid AND user_id = ${user.id}::uuid
          `;
        } else {
          await db.$executeRaw`
            UPDATE people
            SET "gisPoint" = ST_GeogFromText(${ewkt}),
                location = ${locationLabel},
                updated_at = NOW()
            WHERE id = ${personId}::uuid AND user_id = ${user.id}::uuid
          `;
        }
      } catch (err) {
        log?.error(
          { err, personId },
          "Failed to sync preferred address to person during vCard import",
        );
      }
    }),
  );

  const socialRows: Array<{
    userId: string;
    personId: string;
    platform: string;
    handle: string;
  }> = [];

  for (const { contact, personId } of contactPersonPairs) {
    if (contact.linkedin) {
      socialRows.push({
        handle: contact.linkedin,
        personId,
        platform: "linkedin",
        userId: user.id,
      });
    }
    if (contact.instagram) {
      socialRows.push({
        handle: contact.instagram,
        personId,
        platform: "instagram",
        userId: user.id,
      });
    }
    if (contact.whatsapp) {
      socialRows.push({
        handle: contact.whatsapp,
        personId,
        platform: "whatsapp",
        userId: user.id,
      });
    }
    if (contact.facebook) {
      socialRows.push({
        handle: contact.facebook,
        personId,
        platform: "facebook",
        userId: user.id,
      });
    }
    if (contact.signal) {
      socialRows.push({
        handle: contact.signal,
        personId,
        platform: "signal",
        userId: user.id,
      });
    }
    if (contact.website) {
      socialRows.push({
        handle: contact.website,
        personId,
        platform: "website",
        userId: user.id,
      });
    }
  }

  if (socialRows.length > 0) {
    try {
      await db.peopleSocial.createMany({
        data: socialRows,
        skipDuplicates: true,
      });
    } catch (error) {
      log?.error({ err: error }, "Failed to upsert social media during vCard import");
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

        await uploadContactAvatarAndSetFlag(db, user.id, personId, buffer, contentType);
      } catch (error) {
        log?.error({ err: error, personId }, "Failed to upload vCard avatar");
      }
    });

  await Promise.allSettled(avatarUploads);

  const dateRows = contactPersonPairs.flatMap(({ contact, personId }) =>
    (contact.importantDates || []).map((event) => ({
      date: new Date(event.date),
      note: event.note,
      notifyDaysBefore: null,
      personId,
      type: event.type,
      userId: user.id,
    })),
  );

  if (dateRows.length > 0) {
    try {
      await db.peopleImportantDate.createMany({ data: dateRows });
    } catch (error) {
      log?.error({ err: error }, "Failed to insert dates during vCard import");
    }
  }

  try {
    await assignContactsToDefaultImportGroup(ctx, "vcard_import", personIds);
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
