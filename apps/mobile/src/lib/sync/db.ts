import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";
import { runSyncMigrations } from "./schema/migrations";
import { SYNC_DB_NAME } from "./constants";

let dbInstance: SQLiteDatabase | null = null;

export function getSyncDatabase(): SQLiteDatabase {
  if (!dbInstance) {
    const db = openDatabaseSync(SYNC_DB_NAME);
    try {
      runSyncMigrations(db);
      dbInstance = db;
    } catch (error) {
      db.closeSync();
      throw error;
    }
  }

  return dbInstance;
}

export function resetSyncDatabase(): void {
  if (dbInstance) {
    dbInstance.closeSync();
    dbInstance = null;
  }
}
