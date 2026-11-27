import assert from "node:assert/strict";
import { prisma } from "@bondery/db";
import { SYNC_TABLE_KEYS, type SyncTableKey } from "@bondery/schemas/sync";
import { fetchSyncTableRows } from "../lib/data/prisma-sync.js";

type Row = Record<string, unknown>;
type TableMap = Map<string, Row>;

/**
 * Columns left out of the comparison, with the reason for each.
 *
 * - `gisPoint` (people, people_addresses): the bootstrap returns the PostGIS value as EWKB hex.
 *   Log rows that Prisma built (`toSyncRow`) cannot see this column, and the mobile
 *   materializer reads `gis_point`, a key that neither source sends. `latitude` and
 *   `longitude` are compared, and they are what mobile uses for the map.
 */
const IGNORED_COLUMNS: Partial<Record<SyncTableKey, readonly string[]>> = {
  people: ["gisPoint"],
  people_addresses: ["gisPoint"],
};

/** Rows as plain JSON, so a Date, a bigint and a Decimal compare the way a client sees them. */
function toComparable(table: SyncTableKey, row: Row): Row {
  const ignored = new Set(IGNORED_COLUMNS[table] ?? []);
  const json = JSON.parse(JSON.stringify(row)) as Row;
  return Object.fromEntries(Object.entries(json).filter(([column]) => !ignored.has(column)));
}

/**
 * Tables whose rows belong to a person. The mobile materializer deletes them locally when it
 * applies a `people` delete (`apps/mobile/src/lib/sync/materializer/people.ts`), so the API
 * emits one delete for the person and none for the children. The replay does the same.
 */
const PERSON_CHILD_TABLES: readonly SyncTableKey[] = [
  "people_phones",
  "people_emails",
  "people_addresses",
  "people_socials",
  "people_tags",
  "people_important_dates",
  "people_groups",
];

function removePersonChildren(tables: Map<SyncTableKey, TableMap>, personId: string): void {
  for (const childTable of PERSON_CHILD_TABLES) {
    const rows = tables.get(childTable);
    for (const [id, row] of rows ?? []) {
      if (row["person_id"] === personId) {
        rows?.delete(id);
      }
    }
  }
}

/**
 * Replay a user's `sync_change_log` in sequence order into one map per table. An `insert` or
 * `update` sets the row, a `delete` removes it, and a `people` delete also removes the
 * person's child rows, as a mobile client does. This is what a client holds after it
 * bootstraps on an empty log and then pulls every batch.
 */
export async function replaySyncLog(userId: string): Promise<Map<SyncTableKey, TableMap>> {
  const tables = new Map<SyncTableKey, TableMap>(
    SYNC_TABLE_KEYS.map((table) => [table, new Map<string, Row>()]),
  );

  const entries = await prisma.syncChangeLog.findMany({
    orderBy: [{ serverSequence: "asc" }, { changeIndex: "asc" }],
    where: { userId },
  });

  for (const entry of entries) {
    const table = tables.get(entry.tableName as SyncTableKey);
    assert.ok(table, `sync_change_log holds a row for unknown table ${entry.tableName}`);
    if (entry.operation === "delete") {
      table.delete(entry.entityId);
      if (entry.tableName === "people") {
        removePersonChildren(tables, entry.entityId);
      }
      continue;
    }
    table.set(entry.entityId, entry.rowData as Row);
  }

  return tables;
}

/** The rows `GET /sync/bootstrap` returns for the user, keyed by id. */
export async function loadBootstrapTables(userId: string): Promise<Map<SyncTableKey, TableMap>> {
  const tables = new Map<SyncTableKey, TableMap>();
  for (const table of SYNC_TABLE_KEYS) {
    const rows = await fetchSyncTableRows(prisma, userId, table);
    tables.set(table, new Map(rows.map((row) => [String(row["id"]), row])));
  }
  return tables;
}

/**
 * Assert that replaying the user's sync log gives the same rows as the bootstrap.
 *
 * A write path that changes a synced table without writing the log leaves a table where the
 * replay lacks a row, holds a stale value, or still holds a deleted row. The test covering that
 * path then fails. The check is behavioral, so raw SQL and database triggers are covered too.
 *
 * Compared: every synced table (`SYNC_TABLE_KEYS`), the set of row ids, and every column of
 * each row except those in `IGNORED_COLUMNS`. Timestamps such as `updated_at` ARE compared:
 * the log must carry the value the database holds after the last write, otherwise a client
 * resolving by `updated_at` would keep the older row. Call this when the operation under test
 * has finished and no other write for the user is running.
 *
 * Use it only for a user whose whole history went through the API paths under test. Rows that a
 * test inserted with raw Prisma calls are not in the log and fail the check by design.
 */
export async function assertSyncLogMatchesBootstrap(userId: string): Promise<void> {
  const [replayed, bootstrapped] = await Promise.all([
    replaySyncLog(userId),
    loadBootstrapTables(userId),
  ]);

  for (const table of SYNC_TABLE_KEYS) {
    const fromLog = replayed.get(table) ?? new Map<string, Row>();
    const fromBootstrap = bootstrapped.get(table) ?? new Map<string, Row>();

    assert.deepEqual(
      [...fromLog.keys()].sort((a, b) => a.localeCompare(b)),
      [...fromBootstrap.keys()].sort((a, b) => a.localeCompare(b)),
      `${table}: the sync log and the bootstrap hold different row ids`,
    );

    for (const [id, bootstrapRow] of fromBootstrap) {
      const logRow = fromLog.get(id);
      assert.ok(logRow, `${table} ${id}: missing from the sync log replay`);
      assert.deepEqual(
        toComparable(table, logRow),
        toComparable(table, bootstrapRow),
        `${table} ${id}: the replayed row differs from the bootstrap row`,
      );
    }
  }
}
