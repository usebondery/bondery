import type { PrismaClient } from "@bondery/db";
import { formatPlaceLabel } from "@bondery/helpers";
import type { VCardImportCommitResponse, VCardPreparedContact } from "@bondery/schemas";
import {
  setContactHasAvatarSynced,
  uploadContactAvatarFile,
} from "../../lib/contacts/avatar-storage.js";
import { decodeDataUri } from "../../lib/import/decode-data-uri.js";
import { assignContactsToDefaultImportGroup } from "../../lib/import/default-groups.js";
import { validateImageMagicBytes, validateImageUpload } from "../../lib/platform/config.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import { type SyncedWrite, withSyncedWrite } from "../../lib/sync/synced-write.js";
import type { DomainContext } from "../_shared/context.js";
import { scheduleMergeRecommendationsRefresh } from "../contacts/merge-recommendations.js";

/** Raised transaction limit: a large address book writes thousands of rows in one commit. */
const VCARD_IMPORT_TRANSACTION_TIMEOUT_MS = 120_000;

type ContactPersonPair = { contact: VCardPreparedContact; personId: string };

const SOCIAL_FIELDS = [
  "linkedin",
  "instagram",
  "whatsapp",
  "facebook",
  "signal",
  "website",
] as const;

function buildSocialRows(userId: string, pairs: ContactPersonPair[]) {
  return pairs.flatMap(({ contact, personId }) =>
    SOCIAL_FIELDS.flatMap((platform) => {
      const handle = contact[platform];
      return handle ? [{ handle, personId, platform, userId }] : [];
    }),
  );
}

function buildAddressRows(userId: string, pairs: ContactPersonPair[]) {
  return pairs.flatMap(({ contact, personId }) => {
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
      userId,
      value: address.value,
    }));
  });
}

/** The address that sets a person's map point, location label and timezone. */
function pickLocationAddress(contact: VCardPreparedContact) {
  const validAddresses = contact.addresses.filter(
    (address) => address.validity === "valid" && address.latitude && address.longitude,
  );
  const picked =
    validAddresses.find((address) => address.preferred) ??
    validAddresses.find((address) => address.type === "home") ??
    validAddresses[0];

  if (!picked || picked.latitude === null || picked.longitude === null) {
    return null;
  }
  return picked;
}

/**
 * Copy each person's preferred address to the person row (map point, location, timezone) in one
 * statement. The timezone only changes when the address has one.
 */
async function applyPreferredAddresses(
  db: PrismaClient,
  userId: string,
  pairs: ContactPersonPair[],
): Promise<void> {
  const ids: string[] = [];
  const ewkts: string[] = [];
  const locations: string[] = [];
  const timezones: (string | null)[] = [];

  for (const { contact, personId } of pairs) {
    const picked = pickLocationAddress(contact);
    if (!picked) {
      continue;
    }
    const locationLabel =
      formatPlaceLabel({
        city: picked.addressCity ?? undefined,
        countryCode: picked.addressCountryCode ?? undefined,
        state: picked.addressState ?? undefined,
      }) ||
      picked.addressCity ||
      picked.value;

    ids.push(personId);
    ewkts.push(`SRID=4326;POINT(${picked.longitude} ${picked.latitude})`);
    locations.push(locationLabel);
    timezones.push(picked.timezone || null);
  }

  if (ids.length === 0) {
    return;
  }

  await db.$executeRaw`
    UPDATE people AS p
    SET "gisPoint" = ST_GeogFromText(v.ewkt),
        location = v.location,
        timezone = COALESCE(v.timezone, p.timezone),
        updated_at = NOW()
    FROM unnest(${ids}::uuid[], ${ewkts}::text[], ${locations}::text[], ${timezones}::text[])
      AS v(id, ewkt, location, timezone)
    WHERE p.id = v.id AND p.user_id = ${userId}::uuid
  `;
}

/** Insert the people and their child rows. Every inserted id goes to the sync log. */
async function writeContacts(
  sw: SyncedWrite,
  contacts: VCardPreparedContact[],
): Promise<ContactPersonPair[]> {
  const { db, userId } = sw;
  const now = new Date();

  const insertedPeople = await db.people.createManyAndReturn({
    data: contacts.map((contact) => ({
      firstName: contact.firstName,
      headline: contact.headline,
      lastInteraction: now,
      lastName: contact.lastName,
      middleName: contact.middleName,
      myself: false,
      userId,
    })),
    select: { id: true },
  });
  sw.touch(
    "people",
    insertedPeople.map((person) => person.id),
  );

  // `createManyAndReturn` returns one row per input row, in input order.
  const pairs = contacts.flatMap((contact, index) => {
    const personId = insertedPeople[index]?.id;
    return personId === undefined ? [] : [{ contact, personId }];
  });

  const phones = await db.peoplePhone.createManyAndReturn({
    data: pairs.flatMap(({ contact, personId }) =>
      contact.phones.map((phone, sortOrder) => ({
        personId,
        preferred: phone.preferred,
        prefix: phone.prefix,
        sortOrder,
        type: phone.type,
        userId,
        value: phone.value,
      })),
    ),
    select: { id: true },
  });
  sw.touch(
    "people_phones",
    phones.map((row) => row.id),
  );

  const emails = await db.peopleEmail.createManyAndReturn({
    data: pairs.flatMap(({ contact, personId }) =>
      contact.emails.map((email, sortOrder) => ({
        personId,
        preferred: email.preferred,
        sortOrder,
        type: email.type,
        userId,
        value: email.value,
      })),
    ),
    select: { id: true },
  });
  sw.touch(
    "people_emails",
    emails.map((row) => row.id),
  );

  const addresses = await db.peopleAddress.createManyAndReturn({
    data: buildAddressRows(userId, pairs),
    select: { id: true },
  });
  sw.touch(
    "people_addresses",
    addresses.map((row) => row.id),
  );

  await applyPreferredAddresses(db, userId, pairs);

  const socials = await db.peopleSocial.createManyAndReturn({
    data: buildSocialRows(userId, pairs),
    select: { id: true },
    skipDuplicates: true,
  });
  sw.touch(
    "people_socials",
    socials.map((row) => row.id),
  );

  const dates = await db.peopleImportantDate.createManyAndReturn({
    data: pairs.flatMap(({ contact, personId }) =>
      (contact.importantDates || []).map((event) => ({
        date: new Date(event.date),
        note: event.note,
        notifyDaysBefore: null,
        personId,
        type: event.type,
        userId,
      })),
    ),
    select: { id: true },
  });
  sw.touch(
    "people_important_dates",
    dates.map((row) => row.id),
  );

  await assignContactsToDefaultImportGroup(
    sw,
    "vcard_import",
    pairs.map((pair) => pair.personId),
  );

  return pairs;
}

/**
 * Insert the contacts and write the sync log in one transaction. A failed statement aborts the
 * whole import, so nothing is half written.
 */
async function insertContacts(
  ctx: DomainContext,
  contacts: VCardPreparedContact[],
): Promise<ContactPersonPair[]> {
  try {
    return await withSyncedWrite(ctx, (sw) => writeContacts(sw, contacts), {
      timeoutMs: VCARD_IMPORT_TRANSACTION_TIMEOUT_MS,
    });
  } catch (error) {
    throw internal("import_vcard_failed", error instanceof Error ? error.message : "Insert failed");
  }
}

/** Read, validate and store one vCard photo file. Returns true when the file was stored. */
async function storeVCardAvatar(
  ctx: DomainContext,
  avatarUri: string,
  personId: string,
): Promise<boolean> {
  let buffer: Buffer;
  let contentType: string;

  if (avatarUri.startsWith("data:")) {
    const decoded = decodeDataUri(avatarUri);
    if (!decoded) {
      return false;
    }
    ({ buffer, contentType } = decoded);
  } else if (avatarUri.startsWith("http")) {
    const response = await fetch(avatarUri);
    if (!response.ok) {
      return false;
    }
    const blob = await response.blob();
    buffer = Buffer.from(await blob.arrayBuffer());
    contentType = blob.type;
  } else {
    return false;
  }

  const validation = validateImageUpload({ size: buffer.length, type: contentType });
  if (!validation.isValid || !validateImageMagicBytes(buffer)) {
    return false;
  }

  await uploadContactAvatarFile(ctx.user.id, personId, buffer, contentType);
  return true;
}

/**
 * Fetch and store the photos first. They are slow external I/O and must not sit inside a
 * transaction. One short transaction then sets `has_avatar` for every stored photo and writes
 * the sync log.
 */
async function attachAvatars(ctx: DomainContext, pairs: ContactPersonPair[]): Promise<void> {
  const withAvatar = pairs.filter(({ contact }) => contact.avatarUri);
  const stored = await Promise.all(
    withAvatar.map(async ({ contact, personId }): Promise<string | null> => {
      try {
        const isStored = await storeVCardAvatar(ctx, contact.avatarUri ?? "", personId);
        return isStored ? personId : null;
      } catch (error) {
        ctx.log?.error({ err: error, personId }, "Failed to upload vCard avatar");
        return null;
      }
    }),
  );

  const storedIds = stored.filter((id): id is string => id !== null);
  if (storedIds.length === 0) {
    return;
  }

  await withSyncedWrite(
    ctx,
    async (sw) => {
      for (const personId of storedIds) {
        await setContactHasAvatarSynced(sw, personId, true);
      }
    },
    { timeoutMs: VCARD_IMPORT_TRANSACTION_TIMEOUT_MS },
  );
}

export async function commitVCardImport(
  ctx: DomainContext,
  rawImportContacts: VCardPreparedContact[],
): Promise<VCardImportCommitResponse> {
  const contacts = rawImportContacts.filter((contact) => contact.isValid);
  const skippedCount = rawImportContacts.length - contacts.length;

  if (contacts.length === 0) {
    return {
      importedCount: 0,
      skippedCount,
    };
  }

  const pairs = await insertContacts(ctx, contacts);
  await attachAvatars(ctx, pairs);

  if (pairs.length > 0) {
    scheduleMergeRecommendationsRefresh(ctx);
  }

  return {
    importedCount: pairs.length,
    skippedCount,
  };
}
