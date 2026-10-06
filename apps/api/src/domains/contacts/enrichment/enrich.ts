import type { Prisma } from "@bondery/db";
import { cleanPersonName } from "@bondery/helpers/name";
import type { EnrichContactRequest } from "@bondery/schemas";
import {
  updateContactPhoto,
  uploadAllLinkedInLogos,
  upsertLinkedInHistory,
} from "../../../lib/import/linkedin-helpers.js";
import { cachedGeocodeLinkedInLocation } from "../../../lib/integrations/mapy.js";
import { type DomainContext, DomainError } from "../../_shared/context.js";
import { domainDb } from "../../_shared/domain-db.js";

export async function enrichContact(
  ctx: DomainContext,
  personId: string,
  input: EnrichContactRequest,
): Promise<{ success: true }> {
  const { user, log } = ctx;
  const db = domainDb(ctx);
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
  } = input;

  log?.info(
    {
      educationCount: educationHistory?.length ?? 0,
      hasBio: Boolean(linkedinBio),
      personId,
      userId: user.id,
      workHistoryCount: workHistory?.length ?? 0,
    },
    "[enrich] POST received",
  );

  const person = await db.people.findFirst({
    select: { headline: true, id: true, location: true },
    where: { id: personId, userId: user.id },
  });

  if (!person) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  const hasWork = Boolean(workHistory && workHistory.length > 0);
  const hasEducation = Boolean(educationHistory && educationHistory.length > 0);
  if (!hasWork && !hasEducation && !linkedinBio) {
    log?.warn({ personId }, "[enrich] No LinkedIn history in payload");
  }

  await upsertLinkedInHistory(db, user.id, personId, linkedinBio, workHistory, educationHistory);

  try {
    await uploadAllLinkedInLogos(user.id, workHistory, educationHistory);
  } catch (err) {
    log?.error({ err }, "[enrich] Logo upload failed, continuing");
  }

  if (profileImageUrl) {
    try {
      await updateContactPhoto(personId, user.id, profileImageUrl);
    } catch (err) {
      log?.error({ err }, "[enrich] Photo update failed, continuing");
    }
  }

  const fieldUpdates: Prisma.PeopleUpdateManyMutationInput = {};
  let gisPointEwkt: string | null | undefined;

  if (profileImageUrl) {
    fieldUpdates.updatedAt = new Date();
  }
  if (firstName !== undefined) {
    fieldUpdates.firstName = cleanPersonName(firstName) || undefined;
  }
  if (middleName !== undefined) {
    fieldUpdates.middleName = cleanPersonName(middleName) || null;
  }
  if (lastName !== undefined) {
    fieldUpdates.lastName = cleanPersonName(lastName) || null;
  }

  if (headline && !person.headline) {
    fieldUpdates.headline = headline;
  }

  if (location) {
    fieldUpdates.location = location;
    try {
      const result = await cachedGeocodeLinkedInLocation(location);
      if (result) {
        const { geo, timezone: tz } = result;
        if (geo.formattedLabel) {
          fieldUpdates.location = geo.formattedLabel;
        }
        gisPointEwkt = geo.locationEwkt;
        if (tz) {
          fieldUpdates.timezone = tz;
        }
      }
    } catch (err) {
      log?.error({ err }, "[enrich] Geocode failed, continuing without coordinates");
    }
  }

  if (Object.keys(fieldUpdates).length > 0 || gisPointEwkt !== undefined) {
    fieldUpdates.updatedAt = new Date();
    await db.people.updateMany({
      data: fieldUpdates,
      where: { id: personId, userId: user.id },
    });

    if (gisPointEwkt) {
      await db.$executeRaw`
        UPDATE people
        SET gis_point = ST_GeogFromText(${gisPointEwkt}),
            updated_at = NOW()
        WHERE id = ${personId}::uuid AND user_id = ${user.id}::uuid
      `;
    }
  }

  log?.info(
    {
      educationCount: educationHistory?.length ?? 0,
      hasBio: Boolean(linkedinBio),
      personId,
      workHistoryCount: workHistory?.length ?? 0,
    },
    "[enrich] Enrichment complete",
  );
  return { success: true };
}
