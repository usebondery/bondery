import { type PrismaClient, prisma } from "@bondery/db";
import type { SyncChange, SyncTableKey } from "@bondery/schemas/sync";
import { toPeopleTagSyncRow, toSyncRow } from "../../domains/_shared/prisma-helpers.js";

type Row = Record<string, unknown>;

type ChildTable =
  | "people_phones"
  | "people_emails"
  | "people_addresses"
  | "people_socials"
  | "people_important_dates"
  | "people_tags";

function upsertChange(table: SyncTableKey, row: Row): SyncChange {
  const id = String(row["id"]);
  return { entityId: id, operation: "update", table, value: row };
}

function deleteChange(table: SyncTableKey, entityId: string): SyncChange {
  return { entityId, operation: "delete", table, value: null };
}

async function listChildIds(
  db: PrismaClient,
  table: ChildTable,
  userId: string,
  personId: string,
): Promise<string[]> {
  const rows = await loadChildRows(db, table, userId, personId);
  return rows.map((row) => String(row["id"]));
}

async function loadChildRows(
  db: PrismaClient,
  table: ChildTable,
  userId: string,
  personId: string,
): Promise<Row[]> {
  switch (table) {
    case "people_phones":
      return (await db.peoplePhone.findMany({ where: { personId, userId } })).map(toSyncRow);
    case "people_emails":
      return (await db.peopleEmail.findMany({ where: { personId, userId } })).map(toSyncRow);
    case "people_addresses":
      return (await db.peopleAddress.findMany({ where: { personId, userId } })).map(toSyncRow);
    case "people_socials":
      return (await db.peopleSocial.findMany({ where: { personId, userId } })).map(toSyncRow);
    case "people_important_dates":
      return (await db.peopleImportantDate.findMany({ where: { personId, userId } })).map(
        toSyncRow,
      );
    case "people_tags":
      return (await db.peopleTag.findMany({ where: { personId, userId } })).map(toPeopleTagSyncRow);
    default:
      return [];
  }
}

export async function buildPeopleRowChange(
  userId: string,
  personId: string,
  db: PrismaClient = prisma,
): Promise<SyncChange | null> {
  const row = await db.people.findFirst({
    where: { id: personId, userId },
  });

  if (!row) {
    return null;
  }
  return upsertChange("people", toSyncRow(row));
}

export function buildPeopleDeleteChange(personId: string): SyncChange {
  return deleteChange("people", personId);
}

export async function buildContactSnapshotChanges(
  userId: string,
  personId: string,
  db: PrismaClient = prisma,
): Promise<SyncChange[]> {
  const changes: SyncChange[] = [];
  const peopleChange = await buildPeopleRowChange(userId, personId, db);
  if (peopleChange) {
    changes.push(peopleChange);
  }

  const childTables: ChildTable[] = [
    "people_phones",
    "people_emails",
    "people_addresses",
    "people_socials",
    "people_important_dates",
    "people_tags",
  ];

  for (const table of childTables) {
    const rows = await loadChildRows(db, table, userId, personId);
    for (const row of rows) {
      changes.push(upsertChange(table, row));
    }
  }

  return changes;
}

export async function buildChildTableReplaceChanges(
  userId: string,
  personId: string,
  table: Exclude<ChildTable, "people_tags">,
  priorIds: string[],
  db: PrismaClient = prisma,
): Promise<SyncChange[]> {
  const rows = await loadChildRows(db, table, userId, personId);
  const currentIds = new Set(rows.map((row) => String(row["id"])));
  const changes: SyncChange[] = [];

  for (const id of priorIds) {
    if (!currentIds.has(id)) {
      changes.push(deleteChange(table, id));
    }
  }

  for (const row of rows) {
    changes.push(upsertChange(table, row));
  }

  return changes;
}

export async function listContactChildIds(
  userId: string,
  personId: string,
  table: ChildTable,
  db: PrismaClient = prisma,
): Promise<string[]> {
  return listChildIds(db, table, userId, personId);
}

export function buildGroupRowChange(group: Row): SyncChange {
  return upsertChange("groups", group);
}

export function buildGroupDeleteChange(groupId: string): SyncChange {
  return deleteChange("groups", groupId);
}

export async function buildPeopleGroupsChanges(
  userId: string,
  groupId: string,
  personIds: string[],
  operation: "insert" | "delete",
  db: PrismaClient = prisma,
): Promise<SyncChange[]> {
  if (personIds.length === 0) {
    return [];
  }

  const rows = await db.peopleGroup.findMany({
    where: { groupId, personId: { in: personIds }, userId },
  });

  return rows.map((row) => {
    const syncRow = toSyncRow(row);
    const id = String(syncRow["id"]);
    if (operation === "delete") {
      return deleteChange("people_groups", id);
    }
    return upsertChange("people_groups", syncRow);
  });
}

export function buildTagRowChange(tag: Row): SyncChange {
  return upsertChange("tags", tag);
}

export function buildTagDeleteChange(tagId: string): SyncChange {
  return deleteChange("tags", tagId);
}

export function buildPeopleTagChangeFromRow(row: Row): SyncChange {
  return upsertChange("people_tags", row);
}

export async function buildPeopleTagChange(
  userId: string,
  personId: string,
  tagId: string,
  db: PrismaClient = prisma,
): Promise<SyncChange | null> {
  const row = await db.peopleTag.findFirst({
    where: { personId, tagId, userId },
  });

  if (!row) {
    return null;
  }
  return upsertChange("people_tags", toPeopleTagSyncRow(row));
}

export async function findPeopleTagId(
  userId: string,
  personId: string,
  tagId: string,
  db: PrismaClient = prisma,
): Promise<string | null> {
  const row = await db.peopleTag.findFirst({
    select: { id: true },
    where: { personId, tagId, userId },
  });
  return row?.id ?? null;
}

export async function buildPeopleTagChangeWithDb(
  db: PrismaClient,
  userId: string,
  personId: string,
  tagId: string,
): Promise<SyncChange | null> {
  return buildPeopleTagChange(userId, personId, tagId, db);
}

export async function findPeopleTagIdWithDb(
  db: PrismaClient,
  userId: string,
  personId: string,
  tagId: string,
): Promise<string | null> {
  return findPeopleTagId(userId, personId, tagId, db);
}

export async function buildPeopleGroupChangeWithDb(
  db: PrismaClient,
  userId: string,
  personId: string,
  groupId: string,
): Promise<SyncChange | null> {
  const row = await db.peopleGroup.findFirst({
    where: { groupId, personId, userId },
  });

  if (!row) {
    return null;
  }

  return upsertChange("people_groups", toSyncRow(row));
}

export async function findPeopleGroupIdWithDb(
  db: PrismaClient,
  userId: string,
  personId: string,
  groupId: string,
): Promise<string | null> {
  const row = await db.peopleGroup.findFirst({
    select: { id: true },
    where: { groupId, personId, userId },
  });
  return row?.id ?? null;
}

export async function buildGroupSelectRow(
  userId: string,
  groupId: string,
  db: PrismaClient = prisma,
): Promise<Row | null> {
  const row = await db.group.findFirst({
    where: { id: groupId, userId },
  });

  return row ? toSyncRow(row) : null;
}
