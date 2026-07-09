import type { SQLiteDatabase } from "expo-sqlite";
import { readBoolInt, readNumber, readString, type ShapeRowMessage } from "./read-row";

export function applyPeopleShapeOp(db: SQLiteDatabase, message: ShapeRowMessage): void {
  const { operation, value } = message;
  const id = readString(value, "id");
  if (!id) {
    return;
  }

  if (operation === "delete") {
    db.runSync("DELETE FROM people WHERE id = ?", id);
    db.runSync("DELETE FROM people_phones WHERE person_id = ?", id);
    db.runSync("DELETE FROM people_emails WHERE person_id = ?", id);
    db.runSync("DELETE FROM people_addresses WHERE person_id = ?", id);
    db.runSync("DELETE FROM people_socials WHERE person_id = ?", id);
    db.runSync("DELETE FROM people_tags WHERE person_id = ?", id);
    db.runSync("DELETE FROM people_important_dates WHERE person_id = ?", id);
    db.runSync("DELETE FROM people_groups WHERE person_id = ?", id);
    return;
  }

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
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      local_updated_at = excluded.updated_at,
      is_pending = 0`,
    id,
    readString(value, "user_id") ?? "",
    readString(value, "first_name") ?? "",
    readString(value, "middle_name"),
    readString(value, "last_name"),
    readString(value, "headline"),
    readString(value, "location"),
    readString(value, "notes"),
    readString(value, "last_interaction"),
    readNumber(value, "keep_frequency_days"),
    readBoolInt(value, "myself"),
    readString(value, "language"),
    readString(value, "timezone"),
    readString(value, "gis_point"),
    readBoolInt(value, "has_avatar"),
    readString(value, "notes_updated_at"),
    readString(value, "last_interaction_activity_id"),
    readString(value, "created_at"),
    readString(value, "updated_at"),
    readString(value, "updated_at"),
  );
}
