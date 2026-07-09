import type { Contact, Group, GroupWithCount } from "@bondery/schemas";
import { GROUPS_ORDER_BY_LABEL, type GroupRow, mapGroupRow } from "../../resources/groups";
import { getSyncDatabase } from "../db";
import { listContacts } from "./contacts";

export function listGroups(): GroupWithCount[] {
  const db = getSyncDatabase();
  const rows = db.getAllSync<GroupRow>(`SELECT * FROM groups ${GROUPS_ORDER_BY_LABEL}`);

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

  if (!row) {
    return null;
  }

  return mapGroupRow(row);
}

export function listGroupContacts(options: {
  groupId: string;
  query?: string;
  limit: number;
  offset: number;
}): { contacts: Contact[]; totalCount: number } {
  return listContacts({
    excludeMyself: true,
    groupId: options.groupId,
    limit: options.limit,
    offset: options.offset,
    query: options.query,
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
