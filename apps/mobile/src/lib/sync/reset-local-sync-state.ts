import { clearPendingAvatarJobs, deleteAvatarsDirectory } from "./avatar-files";
import { getSyncDatabase, resetSyncDatabase } from "./db";
import { resetInitialSyncSnapshot, stopPullSync } from "./pull-manager";
import { wipeSyncDatabase } from "./schema/migrations";
import { replaceSqliteQueryClient } from "./sqlite-query-client";

/** Clears SQLite domain data and stops pull sync. */
export async function resetLocalSyncState(): Promise<void> {
  await stopPullSync();

  try {
    wipeSyncDatabase(getSyncDatabase());
  } catch {
    // Database may not be open yet during early logout.
  }

  clearPendingAvatarJobs();
  deleteAvatarsDirectory();
  resetSyncDatabase();
  resetInitialSyncSnapshot();
  replaceSqliteQueryClient();
}
