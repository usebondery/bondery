import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SQLITE_SCHEMA_VERSION } from "@bondery/schemas/sync";
import type { SQLiteDatabase } from "expo-sqlite";
import { SYNC_META_KEYS } from "../constants.ts";
import { runSyncMigrations, wipeSyncDatabase } from "./migrations.ts";

const PRAGMA_WAL_RE = /PRAGMA\s+journal_mode\s*=\s*WAL/iu;
const WHITESPACE_RE = /\s+/u;
const CREATE_TABLE_RE = /CREATE TABLE IF NOT EXISTS (?<group1>\w+)/iu;
const DROP_TABLE_RE = /DROP TABLE IF EXISTS (?<group1>\w+)/iu;
const ALTER_ADD_COLUMN_RE = /ALTER TABLE (?<group1>\w+) ADD COLUMN (?<group2>\w+)/iu;
const PRAGMA_TABLE_INFO_RE = /PRAGMA table_info\((?<group1>\w+)\)/iu;
function isWalPragma(sql: string): boolean {
  return PRAGMA_WAL_RE.test(sql);
}

function parseCreateTableColumns(sql: string): string[] {
  const open = sql.indexOf("(");
  const close = sql.lastIndexOf(")");
  if (open < 0 || close < 0) {
    return [];
  }
  return sql
    .slice(open + 1, close)
    .split(",")
    .map((part) => part.trim().split(WHITESPACE_RE)[0])
    .filter((name) => name.length > 0);
}

function createMemoryDb(
  initialTables: string[] = [],
  initialMeta: Record<string, string> = {},
  initialColumns: Record<string, string[]> = {},
) {
  const tables = new Set(initialTables);
  const columns = new Map<string, Set<string>>(
    Object.entries(initialColumns).map(([table, names]) => [table, new Set(names)]),
  );
  const meta = new Map(Object.entries(initialMeta));
  const walPragmaInTransaction: boolean[] = [];
  const droppedTables: string[] = [];
  let inTransaction = false;

  const db = {
    execSync(sql: string) {
      if (isWalPragma(sql)) {
        walPragmaInTransaction.push(inTransaction);
        if (inTransaction) {
          throw new Error("cannot change into wal mode from within a transaction");
        }
      }
      const create = CREATE_TABLE_RE.exec(sql);
      if (create) {
        const [, table] = create;
        const existed = tables.has(table);
        tables.add(table);
        if (!existed) {
          columns.set(table, new Set(parseCreateTableColumns(sql)));
        }
      }
      const drop = DROP_TABLE_RE.exec(sql);
      if (drop) {
        droppedTables.push(drop[1]);
        tables.delete(drop[1]);
        columns.delete(drop[1]);
      }
      const alter = ALTER_ADD_COLUMN_RE.exec(sql);
      if (alter) {
        const tableColumns = columns.get(alter[1]) ?? new Set<string>();
        tableColumns.add(alter[2]);
        columns.set(alter[1], tableColumns);
      }
    },
    getAllSync(sql: string) {
      const pragma = PRAGMA_TABLE_INFO_RE.exec(sql);
      if (pragma) {
        return [...(columns.get(pragma[1]) ?? [])].map((name) => ({ name }));
      }
      return [];
    },
    getFirstSync(sql: string, bind?: unknown) {
      if (sql.includes("sqlite_master")) {
        const name = String(bind);
        return tables.has(name) ? { name } : null;
      }
      if (sql.includes("FROM sync_meta")) {
        if (!tables.has("sync_meta")) {
          throw new Error("no such table: sync_meta");
        }
        const value = meta.get(String(bind));
        return value === undefined ? null : { value };
      }
      return null;
    },
    runSync(_sql: string, key?: unknown, value?: unknown) {
      if (typeof key === "string" && typeof value === "string") {
        meta.set(key, value);
      }
    },
    withTransactionSync(fn: () => void) {
      if (inTransaction) {
        throw new Error("cannot start a transaction within a transaction");
      }
      inTransaction = true;
      try {
        fn();
      } finally {
        inTransaction = false;
      }
    },
  } as unknown as SQLiteDatabase;

  return { columns, db, droppedTables, meta, tables, walPragmaInTransaction };
}

describe("runSyncMigrations", () => {
  it("creates schema on an empty database without querying missing sync_meta", () => {
    const { db, meta, tables } = createMemoryDb();

    runSyncMigrations(db);

    assert.equal(tables.has("sync_meta"), true);
    assert.equal(tables.has("people"), true);
    assert.equal(tables.has("people_phones"), true);
    assert.equal(meta.get(SYNC_META_KEYS.sqliteSchemaVersion), String(SQLITE_SCHEMA_VERSION));
  });

  it("sets WAL mode outside the schema transaction", () => {
    const { db, walPragmaInTransaction } = createMemoryDb();

    runSyncMigrations(db);

    assert.deepEqual(walPragmaInTransaction, [false]);
  });

  it("upgrades an older schema by recreating domain tables", () => {
    const { db, meta, tables } = createMemoryDb(["sync_meta", "people"], {
      [SYNC_META_KEYS.sqliteSchemaVersion]: "1",
    });

    runSyncMigrations(db);

    assert.equal(tables.has("people"), true);
    assert.equal(tables.has("people_phones"), true);
    assert.equal(meta.get(SYNC_META_KEYS.sqliteSchemaVersion), String(SQLITE_SCHEMA_VERSION));
  });

  it("adds avatar clock columns without dropping an existing people table", () => {
    const currentVersion = String(SQLITE_SCHEMA_VERSION);
    const { columns, db, droppedTables, tables } = createMemoryDb(
      ["sync_meta", "people", "people_phones", "pending_mutations"],
      { [SYNC_META_KEYS.sqliteSchemaVersion]: currentVersion },
      {
        people: ["id", "user_id", "first_name", "has_avatar", "updated_at"],
        people_phones: ["id"],
      },
    );

    runSyncMigrations(db);

    assert.equal(droppedTables.includes("people"), false);
    assert.equal(tables.has("people"), true);
    assert.equal(columns.get("people")?.has("avatar_updated_at"), true);
    assert.equal(columns.get("people")?.has("avatar_local_updated_at"), true);
  });
});

describe("wipeSyncDatabase", () => {
  it("skips missing domain tables instead of throwing", () => {
    const { db } = createMemoryDb(["sync_meta"], {
      [SYNC_META_KEYS.sqliteSchemaVersion]: String(SQLITE_SCHEMA_VERSION),
      leftover: "1",
    });

    assert.doesNotThrow(() => wipeSyncDatabase(db));
  });
});
