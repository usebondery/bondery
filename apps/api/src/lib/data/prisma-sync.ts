import type { PrismaClient } from "@bondery/db";
import { Prisma } from "@bondery/db";
import type { SyncTableKey } from "@bondery/schemas/sync";
import { SYNC_TABLE_KEYS } from "@bondery/schemas/sync";

const SYNC_TABLE_SET = new Set<string>(SYNC_TABLE_KEYS);

type DbRow = Record<string, unknown>;

function serializeRawRow(row: Record<string, unknown>): DbRow {
  const out: DbRow = {};
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "bigint") {
      out[key] = Number(value);
      continue;
    }
    if (value instanceof Date) {
      out[key] = value.toISOString();
      continue;
    }
    out[key] = value;
  }
  return out;
}

type SyncChangeLogRow = {
  server_sequence: number;
  change_index: number;
  table_name: string;
  operation: "insert" | "update" | "delete";
  entity_id: string;
  row_data: Record<string, unknown> | null;
};

/**
 * One server sequence can hold several change-log rows (one per `change_index`).
 * The query reads up to this many rows per requested sequence, so a page of `limit`
 * sequences fits in a single read.
 */
const SYNC_CHANGE_LOG_ROWS_PER_SEQUENCE = 20;

export type { DbRow, SyncChangeLogRow };

export async function fetchSyncTableRows(
  client: PrismaClient,
  userId: string,
  table: SyncTableKey,
): Promise<DbRow[]> {
  if (!SYNC_TABLE_SET.has(table)) {
    throw new Error(`Invalid sync table: ${table}`);
  }

  const rows = await client.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM ${Prisma.raw(table)} WHERE user_id = ${userId}::uuid
  `;

  return rows.map(serializeRawRow);
}

export async function fetchSyncTableRow(
  client: PrismaClient,
  table: SyncTableKey,
  userId: string,
  filter: { column: string; value: string },
): Promise<DbRow[]> {
  if (!SYNC_TABLE_SET.has(table)) {
    throw new Error(`Invalid sync table: ${table}`);
  }

  const rows = await client.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM ${Prisma.raw(table)}
    WHERE user_id = ${userId}::uuid
      AND ${Prisma.raw(filter.column)} = ${filter.value}
  `;

  return rows.map(serializeRawRow);
}

export async function fetchSyncTableRowsByIds(
  client: PrismaClient,
  table: SyncTableKey,
  userId: string,
  filter: { column: string; values: string[] },
): Promise<DbRow[]> {
  if (filter.values.length === 0) {
    return [];
  }
  if (!SYNC_TABLE_SET.has(table)) {
    throw new Error(`Invalid sync table: ${table}`);
  }

  const rows = await client.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM ${Prisma.raw(table)}
    WHERE user_id = ${userId}::uuid
      AND ${Prisma.raw(filter.column)} IN (${Prisma.join(filter.values)})
  `;

  return rows.map(serializeRawRow);
}

export async function fetchSyncChildIds(
  client: PrismaClient,
  table: SyncTableKey,
  userId: string,
  personId: string,
): Promise<string[]> {
  const rows = await fetchSyncTableRow(client, table, userId, {
    column: "person_id",
    value: personId,
  });
  return rows.map((row) => String(row["id"]));
}

export async function fetchSyncPersonRow(
  client: PrismaClient,
  userId: string,
  personId: string,
): Promise<DbRow | null> {
  const rows = await client.$queryRaw<Record<string, unknown>[]>`
    SELECT * FROM people WHERE user_id = ${userId}::uuid AND id = ${personId}::uuid LIMIT 1
  `;
  const [row] = rows;
  return row ? serializeRawRow(row) : null;
}

export async function fetchSyncGroupRow(
  client: PrismaClient,
  userId: string,
  groupId: string,
): Promise<DbRow | null> {
  const rows = await client.$queryRaw<Record<string, unknown>[]>`
    SELECT id, user_id, label, emoji, color, created_at, updated_at
    FROM groups
    WHERE user_id = ${userId}::uuid AND id = ${groupId}::uuid
    LIMIT 1
  `;
  const [row] = rows;
  return row ? serializeRawRow(row) : null;
}

export async function fetchSyncChangeLogRows(
  client: PrismaClient,
  userId: string,
  since: number,
  limit: number,
): Promise<SyncChangeLogRow[]> {
  const rows = await client.$queryRaw<Record<string, unknown>[]>`
    SELECT server_sequence, change_index, table_name, operation, entity_id, row_data
    FROM sync_change_log
    WHERE user_id = ${userId}::uuid
      AND server_sequence > ${since}
    ORDER BY server_sequence ASC, change_index ASC
    LIMIT ${limit * SYNC_CHANGE_LOG_ROWS_PER_SEQUENCE}
  `;

  const parsed = rows.map((row) => serializeRawRow(row) as SyncChangeLogRow);
  const sequences = new Set<number>();
  const filtered: SyncChangeLogRow[] = [];

  for (const row of parsed) {
    if (!sequences.has(row.server_sequence)) {
      if (sequences.size >= limit) {
        break;
      }
      sequences.add(row.server_sequence);
    }

    if (sequences.has(row.server_sequence)) {
      filtered.push(row);
    }
  }

  return filtered;
}
