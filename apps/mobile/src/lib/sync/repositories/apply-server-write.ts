import type { Contact, Group, Tag } from "@bondery/schemas";
import { getSyncDatabase } from "../db";

export function upsertContactFromServer(contact: Contact): void {
  const db = getSyncDatabase();
  const ts = contact.updatedAt ?? new Date().toISOString();

  db.runSync(
    `INSERT INTO people (
      id, user_id, first_name, middle_name, last_name, headline, location, notes,
      last_interaction, keep_frequency_days, myself, language, timezone, gis_point,
      has_avatar, notes_updated_at, last_interaction_activity_id,
      created_at, updated_at, local_updated_at, is_pending
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      first_name = excluded.first_name,
      middle_name = excluded.middle_name,
      last_name = excluded.last_name,
      headline = excluded.headline,
      location = excluded.location,
      notes = excluded.notes,
      last_interaction = excluded.last_interaction,
      keep_frequency_days = excluded.keep_frequency_days,
      myself = excluded.myself,
      language = excluded.language,
      timezone = excluded.timezone,
      gis_point = excluded.gis_point,
      has_avatar = excluded.has_avatar,
      notes_updated_at = excluded.notes_updated_at,
      last_interaction_activity_id = excluded.last_interaction_activity_id,
      updated_at = excluded.updated_at,
      local_updated_at = excluded.updated_at,
      is_pending = 0`,
    contact.id,
    contact.userId,
    contact.firstName,
    contact.middleName,
    contact.lastName,
    contact.headline,
    contact.location,
    contact.notes,
    contact.lastInteraction,
    contact.keepFrequencyDays,
    contact.myself ? 1 : 0,
    contact.language,
    contact.timezone,
    contact.gisPoint,
    contact.avatar ? 1 : 0,
    contact.notesUpdatedAt ?? null,
    contact.lastInteractionActivityId,
    contact.createdAt,
    ts,
    ts,
  );
}

export function upsertGroupFromServer(group: Group): void {
  const db = getSyncDatabase();
  db.runSync(
    `INSERT INTO groups (id, user_id, label, emoji, color, created_at, updated_at, is_pending)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET
       label = excluded.label,
       emoji = excluded.emoji,
       color = excluded.color,
       updated_at = excluded.updated_at,
       is_pending = 0`,
    group.id,
    group.userId,
    group.label,
    group.emoji,
    group.color,
    group.createdAt,
    group.updatedAt,
  );
}

export function upsertTagFromServer(tag: Tag): void {
  const db = getSyncDatabase();
  db.runSync(
    `INSERT INTO tags (id, user_id, label, color, created_at, updated_at, is_pending)
     VALUES (?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(id) DO UPDATE SET
       label = excluded.label,
       color = excluded.color,
       updated_at = excluded.updated_at,
       is_pending = 0`,
    tag.id,
    tag.userId,
    tag.label,
    tag.color,
    tag.createdAt,
    tag.updatedAt,
  );
}
