export type AvatarFileAction = "download" | "delete" | "keep";

export type AvatarFileRow = {
  id: string;
  user_id: string;
  has_avatar: number;
  avatar_updated_at: string | null;
  avatar_local_updated_at: string | null;
};

export type AvatarFs = {
  copyFromUri(personId: string, sourceUri: string): Promise<void>;
  deleteDir(): void;
  deleteFile(personId: string): void;
  download(personId: string, url: string): Promise<void>;
  fileExists(personId: string): boolean;
  fileUri(personId: string): string | null;
};

export type AvatarSqlite = {
  getAllSync: (sql: string, ...params: unknown[]) => AvatarFileRow[];
  runSync: (sql: string, ...params: unknown[]) => unknown;
};

export type AvatarRemoteUrlFn = (
  userId: string,
  personId: string,
  hasAvatar: boolean,
  avatarUpdatedAt: string | null,
) => string | null;

const AVATAR_DOWNLOAD_CONCURRENCY = 4;

const pendingUpserts = new Set<string>();
const pendingDeletes = new Set<string>();

export function decideAvatarFileAction(input: {
  fileExists: boolean;
  hasAvatar: boolean;
  avatarUpdatedAt: string | null;
  avatarLocalUpdatedAt: string | null;
}): AvatarFileAction {
  if (!input.hasAvatar) {
    return input.fileExists ? "delete" : "keep";
  }
  if (!input.fileExists || input.avatarUpdatedAt !== input.avatarLocalUpdatedAt) {
    return "download";
  }
  return "keep";
}

export function notePeopleAvatarUpsert(personId: string): void {
  pendingDeletes.delete(personId);
  pendingUpserts.add(personId);
}

export function notePeopleAvatarDelete(personId: string): void {
  pendingUpserts.delete(personId);
  pendingDeletes.add(personId);
}

export function clearPendingAvatarJobs(): void {
  pendingUpserts.clear();
  pendingDeletes.clear();
}

export function resetPendingAvatarJobsForTests(): void {
  clearPendingAvatarJobs();
}

async function runPool(tasks: Array<() => Promise<void>>, concurrency: number): Promise<void> {
  const executing = new Set<Promise<void>>();
  for (const task of tasks) {
    const run = task().finally(() => {
      executing.delete(run);
    });
    executing.add(run);
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
}

function loadPeopleAvatarRows(db: AvatarSqlite, personIds: string[]): AvatarFileRow[] {
  if (personIds.length === 0) {
    return [];
  }
  const placeholders = personIds.map(() => "?").join(", ");
  return db.getAllSync(
    `SELECT id, user_id, has_avatar, avatar_updated_at, avatar_local_updated_at
     FROM people WHERE id IN (${placeholders})`,
    ...personIds,
  );
}

function markAvatarLocalClock(
  db: AvatarSqlite,
  personId: string,
  avatarUpdatedAt: string | null,
): void {
  db.runSync(
    "UPDATE people SET avatar_local_updated_at = ? WHERE id = ?",
    avatarUpdatedAt,
    personId,
  );
}

/**
 * Apply file downloads/deletes collected during people materialize.
 * Runs after the SQLite transaction so network I/O cannot hold the lock.
 */
export async function runAvatarFileQueue(input: {
  db: AvatarSqlite;
  fs: AvatarFs;
  resolveRemoteUrl: AvatarRemoteUrlFn;
}): Promise<boolean> {
  const upsertIds = [...pendingUpserts];
  const deleteIds = [...pendingDeletes];
  pendingUpserts.clear();
  pendingDeletes.clear();

  if (upsertIds.length === 0 && deleteIds.length === 0) {
    return false;
  }

  let changed = false;
  for (const personId of deleteIds) {
    if (input.fs.fileExists(personId)) {
      input.fs.deleteFile(personId);
      changed = true;
    }
  }

  const rows = loadPeopleAvatarRows(input.db, upsertIds);
  const downloads: Array<() => Promise<void>> = [];

  for (const row of rows) {
    const hasAvatar = row.has_avatar === 1;
    const action = decideAvatarFileAction({
      avatarLocalUpdatedAt: row.avatar_local_updated_at,
      avatarUpdatedAt: row.avatar_updated_at,
      fileExists: input.fs.fileExists(row.id),
      hasAvatar,
    });

    if (action === "delete") {
      input.fs.deleteFile(row.id);
      markAvatarLocalClock(input.db, row.id, null);
      changed = true;
      continue;
    }

    if (action !== "download") {
      continue;
    }

    const remoteUrl = input.resolveRemoteUrl(row.user_id, row.id, true, row.avatar_updated_at);
    if (!remoteUrl) {
      continue;
    }

    downloads.push(async () => {
      try {
        await input.fs.download(row.id, remoteUrl);
        markAvatarLocalClock(input.db, row.id, row.avatar_updated_at);
        changed = true;
      } catch {
        // Retry on the next pull when the file is still missing or stale.
      }
    });
  }

  await runPool(downloads, AVATAR_DOWNLOAD_CONCURRENCY);
  return changed;
}
