import type { Contact, Group, GroupWithCount } from "@bondery/schemas";
import { getSyncDatabase } from "../db";
import { listContacts } from "./contacts";

type GroupRow = {
  id: string;
  user_id: string;
  label: string;
  emoji: string | null;
  color: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function mapGroupRow(row: GroupRow): Group {
  return {
    id: row.id,
    userId: row.user_id,
    label: row.label,
    emoji: row.emoji ?? "👥",
    color: row.color ?? "#868e96",
    createdAt: row.created_at ?? new Date(0).toISOString(),
    updatedAt: row.updated_at ?? new Date(0).toISOString(),
  };
}

export function listGroups(): GroupWithCount[] {
  const db = getSyncDatabase();
  const rows = db.getAllSync<GroupRow>("SELECT * FROM groups ORDER BY label ASC");

  return rows.map((row) => {
    const countRow = db.getFirstSync<{ count: number }>(
      "SELECT COUNT(*) as count FROM people_groups WHERE group_id = ?",
      row.id,
    );
    return {
      ...mapGroupRow(row),
      contactCount: countRow?.count ?? 0,
    };
  });
}

export function getGroup(groupId: string): Group | null {
  const db = getSyncDatabase();
  const row = db.getFirstSync<GroupRow>("SELECT * FROM groups WHERE id = ?", groupId);

  if (!row) return null;

  return mapGroupRow(row);
}

export function listGroupContacts(options: {
  groupId: string;
  query?: string;
  limit: number;
  offset: number;
}): { contacts: Contact[]; totalCount: number } {
  return listContacts({
    groupId: options.groupId,
    query: options.query,
    limit: options.limit,
    offset: options.offset,
    excludeMyself: true,
  });
}

export function listGroupsForContact(personId: string): Group[] {
  const db = getSyncDatabase();
  const rows = db.getAllSync<GroupRow>(
    `SELECT g.* FROM groups g
     INNER JOIN people_groups pg ON pg.group_id = g.id
     WHERE pg.person_id = ?
     ORDER BY g.label ASC`,
    personId,
  );

  return rows.map(mapGroupRow);
}
