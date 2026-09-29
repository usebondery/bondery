import type { Prisma } from "@bondery/db";
import type {
  ContactAddressEntry,
  ContactWritableFields,
  EmailEntry,
  PhoneEntry,
} from "@bondery/schemas";
import { parseAddressEntries, replaceContactAddresses } from "../../lib/contacts/addresses.js";
import {
  parseEmailEntries,
  parsePhoneEntries,
  replaceContactEmails,
  replaceContactPhones,
} from "../../lib/contacts/channels.js";
import { upsertContactSocials } from "../../lib/contacts/socials.js";
import { setPersonLocationWithDb } from "../../lib/data/contact-rpc.js";
import { cachedGeocodeLinkedInLocation } from "../../lib/integrations/mapy.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { listContactChildIds } from "../../lib/sync/build-changes.js";
import { type DomainContext, DomainError } from "../_shared/context.js";
import { domainDb } from "../_shared/domain-db.js";

export type AppliedContactPatch = {
  priorAddressIds: string[] | null;
  priorEmailIds: string[] | null;
  priorPhoneIds: string[] | null;
  socialsUpdated: boolean;
};

/** Applies people-row, geo, channel, and social writes. Caller emits sync. */
export async function applyContactPatch(
  ctx: DomainContext,
  personId: string,
  body: ContactWritableFields,
): Promise<AppliedContactPatch> {
  const { user, log } = ctx;
  const db = domainDb(ctx);

  let priorPhoneIds: string[] | null = null;
  let priorEmailIds: string[] | null = null;
  let priorAddressIds: string[] | null = null;

  const updates: Prisma.PeopleUncheckedUpdateManyInput = {};
  let gisPointEwkt: string | null | undefined;

  if (body.firstName !== undefined) {
    updates.firstName = body.firstName;
  }
  if (body.middleName !== undefined) {
    updates.middleName = body.middleName;
  }
  if (body.lastName !== undefined) {
    updates.lastName = body.lastName;
  }
  if (body.headline !== undefined) {
    updates.headline = body.headline;
  }
  if (body.location !== undefined) {
    updates.location = body.location;
  }
  if (body.notes !== undefined) {
    updates.notes = body.notes;
  }
  if (body.language !== undefined) {
    updates.language = body.language;
  }
  if (body.timezone !== undefined) {
    updates.timezone = body.timezone;
  }
  if (body.gisPoint !== undefined) {
    gisPointEwkt = typeof body.gisPoint === "string" ? body.gisPoint : null;
  }

  const clientProvidesCoords =
    Object.hasOwn(body, "latitude") ||
    Object.hasOwn(body, "longitude") ||
    Object.hasOwn(body, "gisPoint");

  let geocodedLocation: { lat: number; lon: number } | null = null;

  if (body.location && !clientProvidesCoords) {
    try {
      const geocoded = await cachedGeocodeLinkedInLocation(body.location);
      if (geocoded) {
        const { geo, timezone: tz } = geocoded;
        if (geo.formattedLabel) {
          updates.location = geo.formattedLabel;
        }
        geocodedLocation = { lat: geo.lat, lon: geo.lon };
        if (tz && body.timezone === undefined) {
          updates.timezone = tz;
        }
      }
    } catch (err) {
      log?.warn({ err }, "[applyContactPatch] Geocode failed, continuing without coordinates");
    }
  }

  if (body.lastInteraction !== undefined) {
    updates.lastInteraction = body.lastInteraction ? new Date(body.lastInteraction) : null;
    updates.lastInteractionActivityId = null;
  }
  if (body.keepFrequencyDays !== undefined) {
    updates.keepFrequencyDays = body.keepFrequencyDays;
  }

  const hasLatitudeField = Object.hasOwn(body, "latitude");
  const hasLongitudeField = Object.hasOwn(body, "longitude");

  let nextLatitude: number | null | undefined;
  let nextLongitude: number | null | undefined;

  if (hasLatitudeField || hasLongitudeField) {
    nextLatitude = body.latitude ?? null;
    nextLongitude = body.longitude ?? null;

    if ((nextLatitude === null) !== (nextLongitude === null)) {
      throw new DomainError(
        "Both latitude and longitude must be provided together",
        400,
        "contact_location_incomplete",
      );
    }

    if (
      nextLatitude !== null &&
      nextLongitude !== null &&
      (!Number.isFinite(nextLatitude) || !Number.isFinite(nextLongitude))
    ) {
      throw new DomainError("Invalid latitude/longitude values", 400, "contact_location_invalid");
    }
  }

  let nextPhones: PhoneEntry[] | undefined;
  if (body.phones !== undefined) {
    priorPhoneIds = await listContactChildIds(user.id, personId, "people_phones", db);
    try {
      nextPhones = parsePhoneEntries(body.phones);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Invalid phones payload";
      throw new DomainError(message, 400, "contact_invalid");
    }
  }

  let nextEmails: EmailEntry[] | undefined;
  if (body.emails !== undefined) {
    priorEmailIds = await listContactChildIds(user.id, personId, "people_emails", db);
    try {
      nextEmails = parseEmailEntries(body.emails);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Invalid emails payload";
      throw new DomainError(message, 400, "contact_invalid");
    }
  }

  let nextAddresses: ContactAddressEntry[] | undefined;
  if (body.addresses !== undefined) {
    priorAddressIds = await listContactChildIds(user.id, personId, "people_addresses", db);
    try {
      nextAddresses = parseAddressEntries(body.addresses);
    } catch (parseError) {
      const message =
        parseError instanceof Error ? parseError.message : "Invalid addresses payload";
      throw new DomainError(message, 400, "contact_invalid");
    }
  }

  const socialsUpdates: Array<{
    platform: Parameters<typeof upsertContactSocials>[3];
    handle: string | null | undefined;
  }> = [];

  if (body.linkedin !== undefined) {
    socialsUpdates.push({ handle: body.linkedin, platform: "linkedin" });
  }
  if (body.instagram !== undefined) {
    socialsUpdates.push({ handle: body.instagram, platform: "instagram" });
  }
  if (body.whatsapp !== undefined) {
    socialsUpdates.push({ handle: body.whatsapp, platform: "whatsapp" });
  }
  if (body.facebook !== undefined) {
    socialsUpdates.push({ handle: body.facebook, platform: "facebook" });
  }
  if (body.website !== undefined) {
    socialsUpdates.push({ handle: body.website, platform: "website" });
  }
  if (body.signal !== undefined) {
    socialsUpdates.push({ handle: body.signal, platform: "signal" });
  }

  updates.updatedAt = new Date();

  const updated = await db.people.updateMany({
    data: updates,
    where: { id: personId, userId: user.id },
  });

  if (updated.count === 0) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  try {
    if (gisPointEwkt !== undefined) {
      if (gisPointEwkt) {
        await db.$executeRaw`
          UPDATE people
          SET gis_point = ST_GeogFromText(${gisPointEwkt}),
              updated_at = NOW()
          WHERE id = ${personId}::uuid AND user_id = ${user.id}::uuid
        `;
      } else {
        await db.$executeRaw`
          UPDATE people
          SET gis_point = NULL,
              updated_at = NOW()
          WHERE id = ${personId}::uuid AND user_id = ${user.id}::uuid
        `;
      }
    }

    if (hasLatitudeField || hasLongitudeField) {
      await setPersonLocationWithDb(
        db,
        user.id,
        personId,
        nextLatitude ?? null,
        nextLongitude ?? null,
      );
    } else if (geocodedLocation) {
      try {
        await setPersonLocationWithDb(
          db,
          user.id,
          personId,
          geocodedLocation.lat,
          geocodedLocation.lon,
        );
      } catch (geoError) {
        log?.warn({ err: geoError }, "[applyContactPatch] Failed to set geocoded coordinates");
      }
    }

    const parallelOps: Promise<void>[] = [];

    if (nextPhones !== undefined) {
      parallelOps.push(replaceContactPhones(db, user.id, personId, nextPhones));
    }
    if (nextEmails !== undefined) {
      parallelOps.push(replaceContactEmails(db, user.id, personId, nextEmails));
    }
    if (nextAddresses !== undefined) {
      parallelOps.push(replaceContactAddresses(db, user.id, personId, nextAddresses));
    }
    if (socialsUpdates.length > 0) {
      parallelOps.push(
        Promise.all(
          socialsUpdates.map((entry) =>
            upsertContactSocials(db, user.id, personId, entry.platform, entry.handle),
          ),
        ).then(() => undefined),
      );
    }

    if (parallelOps.length > 0) {
      await Promise.all(parallelOps);
    }
  } catch (channelError) {
    const message = channelError instanceof Error ? channelError.message : "Unknown channel error";
    throw internal("contact_failed", message);
  }

  return {
    priorAddressIds,
    priorEmailIds,
    priorPhoneIds,
    socialsUpdated: socialsUpdates.length > 0,
  };
}
