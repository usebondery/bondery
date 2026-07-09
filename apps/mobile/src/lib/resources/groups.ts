import type { Group } from "@bondery/schemas";

export type GroupRow = {
  id: string;
  user_id: string;
  label: string;
  emoji: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
};

export function mapGroupRow(row: GroupRow): Group {
  return {
    color: row.color ?? "#868e96",
    createdAt: row.created_at,
    emoji: row.emoji ?? "👥",
    id: row.id,
    label: row.label,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export const GROUPS_ORDER_BY_LABEL = "ORDER BY label ASC";

export const GROUPS_FOR_CONTACT_SQL = `SELECT g.* FROM groups g
 INNER JOIN people_groups pg ON pg.group_id = g.id
 WHERE pg.person_id = ?
 ORDER BY g.label ASC`;
