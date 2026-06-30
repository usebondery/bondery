import { getSyncDatabase, resetSyncDatabase } from "./db";
import { wipeSyncDatabase } from "./schema/migrations";
import { resetInitialSyncSnapshot, stopPullSync } from "./pull-manager";

/** Clears SQLite domain data and stops pull sync. */
export function resetLocalSyncState(): void {
  void stopPullSync();

  try {
    wipeSyncDatabase(getSyncDatabase());
  } catch {
    // Database may not be open yet during early logout.
  }

  resetSyncDatabase();
  resetInitialSyncSnapshot();
}
