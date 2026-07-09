import { getSyncDatabase, resetSyncDatabase } from "./db";
import { resetInitialSyncSnapshot, stopPullSync } from "./pull-manager";
import { wipeSyncDatabase } from "./schema/migrations";

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
