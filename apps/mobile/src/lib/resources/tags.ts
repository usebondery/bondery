import type { Tag } from "@bondery/schemas";

export type TagRow = {
  id: string;
  user_id: string;
  label: string;
  color: string | null;
  created_at: string;
  updated_at: string;
};

export function mapTagRow(row: TagRow): Tag {
  return {
    color: row.color,
    createdAt: row.created_at,
    id: row.id,
    label: row.label,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export const TAGS_ORDER_BY_LABEL = "ORDER BY label ASC";

export const TAGS_FOR_CONTACT_SQL = `SELECT t.* FROM tags t
 INNER JOIN people_tags pt ON pt.tag_id = t.id
 WHERE pt.person_id = ?
 ORDER BY t.label ASC`;
