import type { Contact, Group, Tag } from "@bondery/schemas";
import { parseAvatarUpdatedAtFromUrl } from "../avatar-clock";
import { notePeopleAvatarUpsert } from "../avatar-file-queue";
import { getSyncDatabase } from "../db";
import { PEOPLE_UPSERT_SQL } from "../materializer/people";

export function upsertContactFromServer(contact: Contact): void {
  const db = getSyncDatabase();
  const ts = contact.updatedAt ?? new Date().toISOString();

  db.runSync(
    PEOPLE_UPSERT_SQL,
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
    contact.gisPoint as string | null,
    contact.avatar ? 1 : 0,
    parseAvatarUpdatedAtFromUrl(contact.avatar),
    contact.notesUpdatedAt ?? null,
    contact.lastInteractionActivityId,
    contact.createdAt,
    ts,
    ts,
  );
  notePeopleAvatarUpsert(contact.id);
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
