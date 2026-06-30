import type { SQLiteDatabase } from "expo-sqlite";
import { SQLITE_SCHEMA_VERSION } from "@bondery/schemas/sync";
import { SYNC_META_KEYS } from "../constants";

const DOMAIN_TABLES = [
  "people",
  "people_phones",
  "people_emails",
  "people_addresses",
  "people_socials",
  "groups",
  "people_groups",
  "tags",
  "people_tags",
  "people_important_dates",
  "pending_mutations",
];

function getStoredSchemaVersion(db: SQLiteDatabase): number | null {
  const row = db.getFirstSync<{ value: string }>(
    "SELECT value FROM sync_meta WHERE key = ?",
    SYNC_META_KEYS.sqliteSchemaVersion,
  );
  if (!row?.value) return null;
  const parsed = Number(row.value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dropDomainTablesIfExist(db: SQLiteDatabase): void {
  db.withTransactionSync(() => {
    for (const table of DOMAIN_TABLES) {
      db.execSync(`DROP TABLE IF EXISTS ${table}`);
    }
    db.execSync(
      `DELETE FROM sync_meta WHERE key NOT IN ('device_id', '${SYNC_META_KEYS.sqliteSchemaVersion}')`,
    );
  });
}

/** @deprecated Use dropDomainTablesIfExist — kept for wipe on logout (tables exist). */
function wipeDomainTables(db: SQLiteDatabase): void {
  db.withTransactionSync(() => {
    for (const table of DOMAIN_TABLES) {
      try {
        db.execSync(`DELETE FROM ${table}`);
      } catch {
        // Table may not exist on schema upgrade from v1.
      }
    }
    db.execSync(
      `DELETE FROM sync_meta WHERE key NOT IN ('device_id', '${SYNC_META_KEYS.sqliteSchemaVersion}')`,
    );
  });
}

function createSchemaV2(db: SQLiteDatabase): void {
  db.execSync("PRAGMA journal_mode = WAL;");

  db.execSync(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS pending_mutations (
      id TEXT PRIMARY KEY NOT NULL,
      client_sequence INTEGER NOT NULL,
      mutation_type TEXT NOT NULL,
      entity_id TEXT,
      base_updated_at TEXT,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      error_message TEXT,
      created_at TEXT NOT NULL
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      first_name TEXT NOT NULL,
      middle_name TEXT,
      last_name TEXT,
      headline TEXT,
      location TEXT,
      notes TEXT,
      last_interaction TEXT,
      keep_frequency_days INTEGER,
      myself INTEGER NOT NULL DEFAULT 0,
      language TEXT,
      timezone TEXT,
      gis_point TEXT,
      has_avatar INTEGER NOT NULL DEFAULT 0,
      notes_updated_at TEXT,
      last_interaction_activity_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      local_updated_at TEXT,
      is_pending INTEGER NOT NULL DEFAULT 0
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS people_phones (
      id TEXT PRIMARY KEY NOT NULL,
      person_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      prefix TEXT NOT NULL DEFAULT '',
      value TEXT NOT NULL,
      preferred INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS people_emails (
      id TEXT PRIMARY KEY NOT NULL,
      person_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      preferred INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS people_addresses (
      id TEXT PRIMARY KEY NOT NULL,
      person_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      label TEXT,
      value TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      address_line1 TEXT,
      address_line2 TEXT,
      address_city TEXT,
      address_state TEXT,
      address_state_code TEXT,
      address_postal_code TEXT,
      address_country TEXT,
      address_country_code TEXT,
      address_formatted TEXT,
      address_granularity TEXT NOT NULL DEFAULT 'unknown',
      address_geocode_source TEXT,
      geocode_confidence TEXT,
      latitude REAL,
      longitude REAL,
      timezone TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS people_socials (
      id TEXT PRIMARY KEY NOT NULL,
      person_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      handle TEXT NOT NULL,
      connected_at TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      label TEXT NOT NULL,
      emoji TEXT,
      color TEXT,
      created_at TEXT,
      updated_at TEXT,
      is_pending INTEGER NOT NULL DEFAULT 0
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS people_groups (
      id TEXT PRIMARY KEY NOT NULL,
      person_id TEXT NOT NULL,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      label TEXT NOT NULL,
      color TEXT,
      created_at TEXT,
      updated_at TEXT,
      is_pending INTEGER NOT NULL DEFAULT 0
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS people_tags (
      id TEXT PRIMARY KEY NOT NULL,
      person_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS people_important_dates (
      id TEXT PRIMARY KEY NOT NULL,
      person_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      note TEXT,
      notify_days_before INTEGER,
      notify_on TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  db.execSync("CREATE INDEX IF NOT EXISTS people_name_idx ON people (first_name, last_name);");
  db.execSync("CREATE INDEX IF NOT EXISTS people_updated_at_idx ON people (updated_at);");
  db.execSync("CREATE INDEX IF NOT EXISTS people_phones_person_idx ON people_phones (person_id);");
  db.execSync("CREATE INDEX IF NOT EXISTS people_emails_person_idx ON people_emails (person_id);");
  db.execSync("CREATE INDEX IF NOT EXISTS people_addresses_person_idx ON people_addresses (person_id);");
  db.execSync("CREATE INDEX IF NOT EXISTS people_socials_person_idx ON people_socials (person_id);");
  db.execSync("CREATE INDEX IF NOT EXISTS people_groups_group_idx ON people_groups (group_id);");
  db.execSync("CREATE INDEX IF NOT EXISTS people_groups_person_idx ON people_groups (person_id);");
  db.execSync("CREATE INDEX IF NOT EXISTS people_tags_person_idx ON people_tags (person_id);");
  db.execSync(
    "CREATE INDEX IF NOT EXISTS people_important_dates_person_idx ON people_important_dates (person_id);",
  );

  db.runSync(
    "INSERT INTO sync_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    SYNC_META_KEYS.sqliteSchemaVersion,
    String(SQLITE_SCHEMA_VERSION),
  );
}

function tableExists(db: SQLiteDatabase, table: string): boolean {
  const row = db.getFirstSync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    table,
  );
  return row?.name === table;
}

export function runSyncMigrations(db: SQLiteDatabase): void {
  const storedVersion = getStoredSchemaVersion(db);
  const needsUpgrade =
    storedVersion !== null && storedVersion !== SQLITE_SCHEMA_VERSION;
  const missingV2Tables =
    storedVersion === SQLITE_SCHEMA_VERSION &&
    !tableExists(db, "people_phones");

  if (needsUpgrade || missingV2Tables) {
    // v1 only had `people` — DELETE FROM new tables threw and blocked createSchemaV2.
    dropDomainTablesIfExist(db);
  }

  db.withTransactionSync(() => {
    createSchemaV2(db);
  });
}

export function wipeSyncDatabase(db: SQLiteDatabase): void {
  db.withTransactionSync(() => {
    for (const table of DOMAIN_TABLES) {
      db.execSync(`DELETE FROM ${table}`);
    }
    db.execSync(
      `DELETE FROM sync_meta WHERE key NOT IN ('device_id', '${SYNC_META_KEYS.sqliteSchemaVersion}')`,
    );
  });
}
