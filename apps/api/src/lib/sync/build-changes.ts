import type { SyncChange, SyncTableKey } from "@bondery/schemas/sync";
import type { DomainSupabaseClient } from "../../domains/_shared/context.js";
import { GROUP_SELECT } from "../data/select-fragments.js";

type Row = Record<string, unknown>;

function upsertChange(table: SyncTableKey, row: Row): SyncChange {
  const id = String(row.id);
  return { entityId: id, operation: "update", table, value: row };
}

function deleteChange(table: SyncTableKey, entityId: string): SyncChange {
  return { entityId, operation: "delete", table, value: null };
}

async function listChildIds(
  client: DomainSupabaseClient,
  table:
    | "people_phones"
    | "people_emails"
    | "people_addresses"
    | "people_socials"
    | "people_important_dates"
    | "people_tags",
  userId: string,
  personId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from(table)
    .select("id")
    .eq("user_id", userId)
    .eq("person_id", personId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => String(row.id));
}

async function loadRows(
  client: DomainSupabaseClient,
  table: SyncTableKey,
  userId: string,
  filter: { column: string; value: string },
): Promise<Row[]> {
  const { data, error } = await client
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .eq(filter.column, filter.value);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Row[];
}

export async function buildPeopleRowChange(
  client: DomainSupabaseClient,
  userId: string,
  personId: string,
): Promise<SyncChange | null> {
  const { data, error } = await client
    .from("people")
    .select("*")
    .eq("user_id", userId)
    .eq("id", personId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }
  return upsertChange("people", data as Row);
}

export function buildPeopleDeleteChange(personId: string): SyncChange {
  return deleteChange("people", personId);
}

export async function buildContactSnapshotChanges(
  client: DomainSupabaseClient,
  userId: string,
  personId: string,
): Promise<SyncChange[]> {
  const changes: SyncChange[] = [];
  const peopleChange = await buildPeopleRowChange(client, userId, personId);
  if (peopleChange) {
    changes.push(peopleChange);
  }

  const childTables = [
    "people_phones",
    "people_emails",
    "people_addresses",
    "people_socials",
    "people_important_dates",
    "people_tags",
  ] as const;

  for (const table of childTables) {
    const rows = await loadRows(client, table, userId, { column: "person_id", value: personId });
    for (const row of rows) {
      changes.push(upsertChange(table, row));
    }
  }

  return changes;
}

export async function buildChildTableReplaceChanges(
  client: DomainSupabaseClient,
  userId: string,
  personId: string,
  table:
    | "people_phones"
    | "people_emails"
    | "people_addresses"
    | "people_socials"
    | "people_important_dates",
  priorIds: string[],
): Promise<SyncChange[]> {
  const rows = await loadRows(client, table, userId, { column: "person_id", value: personId });
  const currentIds = new Set(rows.map((row) => String(row.id)));
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
  client: DomainSupabaseClient,
  userId: string,
  personId: string,
  table:
    | "people_phones"
    | "people_emails"
    | "people_addresses"
    | "people_socials"
    | "people_important_dates"
    | "people_tags",
): Promise<string[]> {
  return listChildIds(client, table, userId, personId);
}

export function buildGroupRowChange(group: Row): SyncChange {
  return upsertChange("groups", group);
}

export function buildGroupDeleteChange(groupId: string): SyncChange {
  return deleteChange("groups", groupId);
}

export async function buildPeopleGroupsChanges(
  client: DomainSupabaseClient,
  userId: string,
  groupId: string,
  personIds: string[],
  operation: "insert" | "delete",
): Promise<SyncChange[]> {
  if (personIds.length === 0) {
    return [];
  }

  const { data, error } = await client
    .from("people_groups")
    .select("*")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .in("person_id", personIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const id = String(row.id);
    if (operation === "delete") {
      return deleteChange("people_groups", id);
    }
    return upsertChange("people_groups", row as Row);
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
  client: DomainSupabaseClient,
  userId: string,
  personId: string,
  tagId: string,
): Promise<SyncChange | null> {
  const { data, error } = await client
    .from("people_tags")
    .select("*")
    .eq("user_id", userId)
    .eq("person_id", personId)
    .eq("tag_id", tagId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }
  return upsertChange("people_tags", data as Row);
}

export async function findPeopleTagId(
  client: DomainSupabaseClient,
  userId: string,
  personId: string,
  tagId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("people_tags")
    .select("id")
    .eq("user_id", userId)
    .eq("person_id", personId)
    .eq("tag_id", tagId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ? String(data.id) : null;
}

export async function buildGroupSelectRow(
  client: DomainSupabaseClient,
  userId: string,
  groupId: string,
): Promise<Row | null> {
  const { data, error } = await client
    .from("groups")
    .select(GROUP_SELECT)
    .eq("user_id", userId)
    .eq("id", groupId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Row | null) ?? null;
}
