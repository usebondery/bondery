import type {
  Contact,
  ContactAddressEntry,
  EmailEntry,
  PhoneEntry,
  TablesUpdate,
  UpdateContactInput,
} from "@bondery/schemas";
import type { SyncChange } from "@bondery/schemas/sync";
import { parseAddressEntries, replaceContactAddresses } from "../../lib/contacts/addresses.js";
import {
  parseEmailEntries,
  parsePhoneEntries,
  replaceContactEmails,
  replaceContactPhones,
} from "../../lib/contacts/channels.js";
import { loadEnrichedContact } from "../../lib/contacts/enrichment.js";
import { upsertContactSocials } from "../../lib/contacts/socials.js";
import { cachedGeocodeLinkedInLocation } from "../../lib/integrations/mapy.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import {
  buildChildTableReplaceChanges,
  buildPeopleRowChange,
  listContactChildIds,
} from "../../lib/sync/build-changes.js";
import { checkContactUpdateConflict } from "../../lib/sync/conflict.js";
import { emitSyncBatch } from "../../lib/sync/emit-change.js";
import { type DomainContext, DomainError, syncEmitMetaFromContext } from "../_shared/context.js";
import { withPersonTxid } from "../_shared/with-txid.js";

export interface UpdateContactDomainInput {
  baseUpdatedAt?: string;
  patch: UpdateContactInput;
  personId: string;
}

export async function updateContact(
  ctx: DomainContext,
  input: UpdateContactDomainInput,
): Promise<{ data: { contact: Contact; personId: string }; txid: string; serverSequence: number }> {
  const { client, user, log } = ctx;
  const { personId, patch: body, baseUpdatedAt } = input;

  if (baseUpdatedAt) {
    await checkContactUpdateConflict(client, user.id, personId, baseUpdatedAt);
  }

  let priorPhoneIds: string[] | null = null;
  let priorEmailIds: string[] | null = null;
  let priorAddressIds: string[] | null = null;

  const updates: TablesUpdate<"people"> = {};

  if (body.firstName !== undefined) {
    updates.first_name = body.firstName;
  }
  if (body.middleName !== undefined) {
    updates.middle_name = body.middleName;
  }
  if (body.lastName !== undefined) {
    updates.last_name = body.lastName;
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
    updates.gis_point = body.gisPoint;
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
      log?.warn({ err }, "[updateContact] Geocode failed, continuing without coordinates");
    }
  }

  if (body.lastInteraction !== undefined) {
    updates.last_interaction = body.lastInteraction;
    updates.last_interaction_activity_id = null;
  }
  if (body.keepFrequencyDays !== undefined) {
    updates.keep_frequency_days = body.keepFrequencyDays;
  }

  const hasLatitudeField = Object.hasOwn(body, "latitude");
  const hasLongitudeField = Object.hasOwn(body, "longitude");

  let nextLatitude: number | null | undefined;
  let nextLongitude: number | null | undefined;

  if (hasLatitudeField || hasLongitudeField) {
    nextLatitude = (body.latitude as number | null | undefined) ?? null;
    nextLongitude = (body.longitude as number | null | undefined) ?? null;

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
    priorPhoneIds = await listContactChildIds(client, user.id, personId, "people_phones");
    try {
      nextPhones = parsePhoneEntries(body.phones);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Invalid phones payload";
      throw new DomainError(message, 400, "contact_invalid");
    }
  }

  let nextEmails: EmailEntry[] | undefined;
  if (body.emails !== undefined) {
    priorEmailIds = await listContactChildIds(client, user.id, personId, "people_emails");
    try {
      nextEmails = parseEmailEntries(body.emails);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Invalid emails payload";
      throw new DomainError(message, 400, "contact_invalid");
    }
  }

  let nextAddresses: ContactAddressEntry[] | undefined;
  if (body.addresses !== undefined) {
    priorAddressIds = await listContactChildIds(client, user.id, personId, "people_addresses");
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

  updates.updated_at = new Date().toISOString();

  const { data: updatedContact, error } = await client
    .from("people")
    .update(updates)
    .eq("id", personId)
    .eq("user_id", user.id)
    .select("id, myself")
    .single();

  if (error) {
    throw internal("contact_failed", error.message);
  }

  if (!updatedContact) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  try {
    if (hasLatitudeField || hasLongitudeField) {
      const { error: locationError } = await client.rpc("set_person_location", {
        p_latitude: (nextLatitude ?? null) as number,
        p_longitude: (nextLongitude ?? null) as number,
        p_person_id: personId,
        p_user_id: user.id,
      });

      if (locationError) {
        throw internal("contact_failed", locationError.message);
      }
    } else if (geocodedLocation) {
      const { error: geoRpcError } = await client.rpc("set_person_location", {
        p_latitude: geocodedLocation.lat as number,
        p_longitude: geocodedLocation.lon as number,
        p_person_id: personId,
        p_user_id: user.id,
      });
      if (geoRpcError) {
        log?.warn({ err: geoRpcError }, "[updateContact] Failed to set geocoded coordinates");
      }
    }

    const parallelOps: Promise<void>[] = [];

    if (nextPhones !== undefined) {
      parallelOps.push(replaceContactPhones(client, user.id, personId, nextPhones));
    }
    if (nextEmails !== undefined) {
      parallelOps.push(replaceContactEmails(client, user.id, personId, nextEmails));
    }
    if (nextAddresses !== undefined) {
      parallelOps.push(replaceContactAddresses(client, user.id, personId, nextAddresses));
    }
    if (socialsUpdates.length > 0) {
      parallelOps.push(
        Promise.all(
          socialsUpdates.map((entry) =>
            upsertContactSocials(client, user.id, personId, entry.platform, entry.handle),
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

  const enrichedContact = await loadEnrichedContact(client, user.id, personId, undefined, log);

  if (!enrichedContact) {
    throw new DomainError("Contact not found", 404, "contact_not_found");
  }

  const { txid } = await withPersonTxid(client, user.id, async () => ({ personId }));

  const changes: SyncChange[] = [];
  const peopleChange = await buildPeopleRowChange(client, user.id, personId);
  if (peopleChange) {
    changes.push(peopleChange);
  }

  if (priorPhoneIds) {
    changes.push(
      ...(await buildChildTableReplaceChanges(
        client,
        user.id,
        personId,
        "people_phones",
        priorPhoneIds,
      )),
    );
  }

  if (priorEmailIds) {
    changes.push(
      ...(await buildChildTableReplaceChanges(
        client,
        user.id,
        personId,
        "people_emails",
        priorEmailIds,
      )),
    );
  }

  if (priorAddressIds) {
    changes.push(
      ...(await buildChildTableReplaceChanges(
        client,
        user.id,
        personId,
        "people_addresses",
        priorAddressIds,
      )),
    );
  }

  if (socialsUpdates.length > 0) {
    const { data: socialRows, error: socialError } = await client
      .from("people_socials")
      .select("*")
      .eq("user_id", user.id)
      .eq("person_id", personId);

    if (socialError) {
      throw internal("contact_failed", socialError.message);
    }

    for (const row of socialRows ?? []) {
      changes.push({
        entityId: String(row.id),
        operation: "update",
        table: "people_socials",
        value: row as Record<string, unknown>,
      });
    }
  }

  const serverSequence = await emitSyncBatch(user.id, changes, syncEmitMetaFromContext(ctx));

  return {
    data: { contact: enrichedContact, personId },
    serverSequence: serverSequence ?? 0,
    txid,
  };
}
