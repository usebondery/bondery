import type { SyncMutation } from "@bondery/schemas/sync";
import { getSyncDatabase } from "../db";
import { generateUuid, isValidUuid } from "../ids";

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return generateUuid();
}

export function applyOptimisticMutation(mutation: SyncMutation): void {
  const db = getSyncDatabase();

  db.withTransactionSync(() => {
    switch (mutation.type) {
      case "contact.create":
        applyOptimisticContactCreate(mutation);
        break;
      case "contact.update":
        applyOptimisticContactUpdate(mutation);
        break;
      case "contact.delete":
        applyOptimisticContactDelete(mutation.entityId);
        break;
      case "contact.addTag":
        applyOptimisticContactAddTag(mutation.entityId, mutation.payload.tagId);
        break;
      case "contact.removeTag":
        applyOptimisticContactRemoveTag(mutation.entityId, mutation.payload.tagId);
        break;
      case "group.create":
        applyOptimisticGroupCreate(mutation);
        break;
      case "group.update":
        applyOptimisticGroupUpdate(mutation.entityId, mutation.payload);
        break;
      case "group.delete":
        db.runSync("DELETE FROM groups WHERE id = ?", mutation.entityId);
        db.runSync("DELETE FROM people_groups WHERE group_id = ?", mutation.entityId);
        break;
      case "group.addMembers":
        applyOptimisticGroupAddMembers(mutation.entityId, mutation.payload.personIds);
        break;
      case "group.removeMembers":
        applyOptimisticGroupRemoveMembers(mutation.entityId, mutation.payload.personIds);
        break;
      case "tag.create":
        applyOptimisticTagCreate(mutation);
        break;
      case "tag.update":
        applyOptimisticTagUpdate(mutation.entityId, mutation.payload);
        break;
      case "tag.delete":
        db.runSync("DELETE FROM tags WHERE id = ?", mutation.entityId);
        db.runSync("DELETE FROM people_tags WHERE tag_id = ?", mutation.entityId);
        break;
      default:
        break;
    }
  });
}

function applyOptimisticContactCreate(
  mutation: Extract<SyncMutation, { type: "contact.create" }>,
): void {
  const db = getSyncDatabase();
  const id = mutation.payload.id ?? mutation.id;
  const ts = nowIso();

  db.runSync(
    `INSERT INTO people (
      id, user_id, first_name, middle_name, last_name, headline, location, notes,
      last_interaction, keep_frequency_days, myself, language, timezone, gis_point,
      has_avatar, created_at, updated_at, local_updated_at, is_pending
    ) VALUES (?, '', ?, ?, ?, NULL, NULL, NULL, ?, NULL, 0, NULL, NULL, NULL, 0, ?, ?, ?, 1)`,
    id,
    mutation.payload.firstName,
    mutation.payload.middleName ?? null,
    mutation.payload.lastName ?? null,
    ts,
    ts,
    ts,
    ts,
  );

  if (mutation.payload.linkedin?.trim()) {
    db.runSync(
      `INSERT INTO people_socials (id, person_id, user_id, platform, handle, created_at, updated_at)
       VALUES (?, ?, '', 'linkedin', ?, ?, ?)`,
      newId(),
      id,
      mutation.payload.linkedin.trim(),
      ts,
      ts,
    );
  }
}

function applyOptimisticContactUpdate(
  mutation: Extract<SyncMutation, { type: "contact.update" }>,
): void {
  const db = getSyncDatabase();
  const patch = mutation.payload;
  const ts = nowIso();
  const personId = mutation.entityId;

  db.runSync(
    `UPDATE people SET
      first_name = COALESCE(?, first_name),
      middle_name = COALESCE(?, middle_name),
      last_name = COALESCE(?, last_name),
      headline = COALESCE(?, headline),
      location = COALESCE(?, location),
      notes = COALESCE(?, notes),
      keep_frequency_days = COALESCE(?, keep_frequency_days),
      language = COALESCE(?, language),
      timezone = COALESCE(?, timezone),
      local_updated_at = ?,
      is_pending = 1
     WHERE id = ?`,
    patch.firstName ?? null,
    patch.middleName ?? null,
    patch.lastName ?? null,
    patch.headline ?? null,
    patch.location ?? null,
    patch.notes ?? null,
    patch.keepFrequencyDays ?? null,
    patch.language ?? null,
    patch.timezone ?? null,
    ts,
    personId,
  );

  if (patch.phones !== undefined) {
    db.runSync("DELETE FROM people_phones WHERE person_id = ?", personId);
    patch.phones?.forEach((phone, index) => {
      db.runSync(
        `INSERT INTO people_phones (id, person_id, user_id, type, prefix, value, preferred, sort_order, created_at, updated_at)
         VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, ?)`,
        newId(),
        personId,
        phone.type,
        phone.prefix,
        phone.value,
        phone.preferred ? 1 : 0,
        index,
        ts,
        ts,
      );
    });
  }

  if (patch.emails !== undefined) {
    db.runSync("DELETE FROM people_emails WHERE person_id = ?", personId);
    patch.emails?.forEach((email, index) => {
      db.runSync(
        `INSERT INTO people_emails (id, person_id, user_id, type, value, preferred, sort_order, created_at, updated_at)
         VALUES (?, ?, '', ?, ?, ?, ?, ?, ?)`,
        newId(),
        personId,
        email.type,
        email.value,
        email.preferred ? 1 : 0,
        index,
        ts,
        ts,
      );
    });
  }

  if (patch.addresses !== undefined) {
    db.runSync("DELETE FROM people_addresses WHERE person_id = ?", personId);
    patch.addresses?.forEach((address, index) => {
      db.runSync(
        `INSERT INTO people_addresses (
          id, person_id, user_id, type, label, value, sort_order,
          address_line1, address_line2, address_city, address_state, address_state_code,
          address_postal_code, address_country, address_country_code, address_formatted,
          address_granularity, address_geocode_source, geocode_confidence, latitude, longitude,
          timezone, created_at, updated_at
        ) VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        newId(),
        personId,
        address.type,
        address.label,
        address.value,
        index,
        address.addressLine1,
        address.addressLine2,
        address.addressCity,
        address.addressState,
        address.addressStateCode,
        address.addressPostalCode,
        address.addressCountry,
        address.addressCountryCode,
        address.addressFormatted,
        address.addressGranularity,
        address.addressGeocodeSource,
        address.geocodeConfidence,
        address.latitude,
        address.longitude,
        address.timezone,
        ts,
        ts,
      );
    });
  }

  if (patch.importantDates !== undefined) {
    db.runSync("DELETE FROM people_important_dates WHERE person_id = ?", personId);
    patch.importantDates?.forEach((entry, _index) => {
      db.runSync(
        `INSERT INTO people_important_dates (
          id, person_id, user_id, type, date, note, notify_days_before, created_at, updated_at
        ) VALUES (?, ?, '', ?, ?, ?, ?, ?, ?)`,
        isValidUuid(entry.id) ? entry.id : newId(),
        personId,
        entry.type,
        entry.date,
        entry.note ?? null,
        entry.notifyDaysBefore ?? null,
        ts,
        ts,
      );
    });
  }

  const socialFields: Array<[string, string | null | undefined]> = [
    ["linkedin", patch.linkedin],
    ["instagram", patch.instagram],
    ["whatsapp", patch.whatsapp],
    ["facebook", patch.facebook],
    ["website", patch.website],
    ["signal", patch.signal],
  ];

  for (const [platform, handle] of socialFields) {
    if (handle === undefined) {
      continue;
    }
    db.runSync(
      "DELETE FROM people_socials WHERE person_id = ? AND platform = ?",
      personId,
      platform,
    );
    if (handle?.trim()) {
      db.runSync(
        `INSERT INTO people_socials (id, person_id, user_id, platform, handle, created_at, updated_at)
         VALUES (?, ?, '', ?, ?, ?, ?)`,
        newId(),
        personId,
        platform,
        handle.trim(),
        ts,
        ts,
      );
    }
  }
}

function applyOptimisticContactDelete(personId: string): void {
  const db = getSyncDatabase();
  db.runSync("DELETE FROM people WHERE id = ?", personId);
  db.runSync("DELETE FROM people_phones WHERE person_id = ?", personId);
  db.runSync("DELETE FROM people_emails WHERE person_id = ?", personId);
  db.runSync("DELETE FROM people_addresses WHERE person_id = ?", personId);
  db.runSync("DELETE FROM people_socials WHERE person_id = ?", personId);
  db.runSync("DELETE FROM people_tags WHERE person_id = ?", personId);
  db.runSync("DELETE FROM people_important_dates WHERE person_id = ?", personId);
  db.runSync("DELETE FROM people_groups WHERE person_id = ?", personId);
}

function applyOptimisticContactAddTag(personId: string, tagId: string): void {
  const db = getSyncDatabase();
  db.runSync(
    `INSERT OR IGNORE INTO people_tags (id, person_id, tag_id, user_id, created_at)
     VALUES (?, ?, ?, '', ?)`,
    newId(),
    personId,
    tagId,
    nowIso(),
  );
}

function applyOptimisticContactRemoveTag(personId: string, tagId: string): void {
  const db = getSyncDatabase();
  db.runSync("DELETE FROM people_tags WHERE person_id = ? AND tag_id = ?", personId, tagId);
}

function applyOptimisticGroupCreate(
  mutation: Extract<SyncMutation, { type: "group.create" }>,
): void {
  const db = getSyncDatabase();
  const id = mutation.payload.id ?? mutation.id;
  const ts = nowIso();
  db.runSync(
    `INSERT INTO groups (id, user_id, label, emoji, color, created_at, updated_at, is_pending)
     VALUES (?, '', ?, ?, ?, ?, ?, 1)`,
    id,
    mutation.payload.label,
    mutation.payload.emoji,
    mutation.payload.color,
    ts,
    ts,
  );
}

function applyOptimisticGroupUpdate(
  groupId: string,
  patch: Extract<SyncMutation, { type: "group.update" }>["payload"],
): void {
  const db = getSyncDatabase();
  const ts = nowIso();
  db.runSync(
    `UPDATE groups SET
      label = COALESCE(?, label),
      emoji = COALESCE(?, emoji),
      color = COALESCE(?, color),
      updated_at = ?,
      is_pending = 1
     WHERE id = ?`,
    patch.label ?? null,
    patch.emoji ?? null,
    patch.color ?? null,
    ts,
    groupId,
  );
}

function applyOptimisticGroupAddMembers(groupId: string, personIds: string[]): void {
  const db = getSyncDatabase();
  const ts = nowIso();
  for (const personId of personIds) {
    db.runSync(
      `INSERT OR IGNORE INTO people_groups (id, person_id, group_id, user_id, created_at)
       VALUES (?, ?, ?, '', ?)`,
      newId(),
      personId,
      groupId,
      ts,
    );
  }
}

function applyOptimisticGroupRemoveMembers(groupId: string, personIds: string[]): void {
  const db = getSyncDatabase();
  for (const personId of personIds) {
    db.runSync("DELETE FROM people_groups WHERE group_id = ? AND person_id = ?", groupId, personId);
  }
}

function applyOptimisticTagCreate(mutation: Extract<SyncMutation, { type: "tag.create" }>): void {
  const db = getSyncDatabase();
  const id = mutation.payload.id ?? mutation.id;
  const ts = nowIso();
  db.runSync(
    `INSERT INTO tags (id, user_id, label, color, created_at, updated_at, is_pending)
     VALUES (?, '', ?, ?, ?, ?, 1)`,
    id,
    mutation.payload.label,
    mutation.payload.color ?? null,
    ts,
    ts,
  );
}

function applyOptimisticTagUpdate(
  tagId: string,
  patch: Extract<SyncMutation, { type: "tag.update" }>["payload"],
): void {
  const db = getSyncDatabase();
  const ts = nowIso();
  db.runSync(
    `UPDATE tags SET
      label = COALESCE(?, label),
      color = COALESCE(?, color),
      updated_at = ?,
      is_pending = 1
     WHERE id = ?`,
    patch.label ?? null,
    patch.color ?? null,
    ts,
    tagId,
  );
}
