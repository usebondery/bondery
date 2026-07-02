import type { Tag, TagWithCount } from "@bondery/schemas";
import { getSyncDatabase } from "../db";

type TagRow = {
  id: string;
  user_id: string;
  label: string;
  color: string | null;
  created_at: string;
  updated_at: string;
};

function mapTagRow(row: TagRow): Tag {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listTags(): TagWithCount[] {
  const db = getSyncDatabase();
  const rows = db.getAllSync<TagRow>("SELECT * FROM tags ORDER BY label ASC");

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

  if (!row) return null;

  return mapTagRow(row);
}

export function listTagsForContact(personId: string): Tag[] {
  const db = getSyncDatabase();
  const rows = db.getAllSync<TagRow>(
    `SELECT t.* FROM tags t
     INNER JOIN people_tags pt ON pt.tag_id = t.id
     WHERE pt.person_id = ?
     ORDER BY t.label ASC`,
    personId,
  );

  return rows.map(mapTagRow);
}
