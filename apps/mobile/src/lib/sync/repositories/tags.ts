import type { Tag, TagWithCount } from "@bondery/schemas";
import {
  mapTagRow,
  TAGS_FOR_CONTACT_SQL,
  TAGS_ORDER_BY_LABEL,
  type TagRow,
} from "../../resources/tags";
import { getSyncDatabase } from "../db";

export function listTags(): TagWithCount[] {
  const db = getSyncDatabase();
  const rows = db.getAllSync<TagRow>(`SELECT * FROM tags ${TAGS_ORDER_BY_LABEL}`);

  return rows.map((row) => {
    const countRow = db.getFirstSync<{ count: number }>(
      "SELECT COUNT(*) as count FROM people_tags WHERE tag_id = ?",
      row.id,
    );
    return {
      ...mapTagRow(row),
      contactCount: countRow?.count ?? 0,
    };
  });
}

export function getTag(tagId: string): Tag | null {
  const db = getSyncDatabase();
  const row = db.getFirstSync<TagRow>("SELECT * FROM tags WHERE id = ?", tagId);

  if (!row) {
    return null;
  }

  return mapTagRow(row);
}

export function listTagsForContact(personId: string): Tag[] {
  const db = getSyncDatabase();
  const rows = db.getAllSync<TagRow>(TAGS_FOR_CONTACT_SQL, personId);
  return rows.map(mapTagRow);
}
