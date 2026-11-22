import { Directory, File, Paths } from "expo-file-system";
import { resolveLocalContactAvatarUrl } from "./avatar";
import { parseAvatarUpdatedAtFromUrl } from "./avatar-clock";
import { type AvatarFs, type AvatarSqlite, runAvatarFileQueue } from "./avatar-file-queue";
import { getSyncDatabase } from "./db";

const AVATARS_DIR_NAME = "avatars";

function avatarsDirectory(): Directory {
  return new Directory(Paths.document, AVATARS_DIR_NAME);
}

function avatarFile(personId: string): File {
  return new File(avatarsDirectory(), `${personId}.jpg`);
}

function ensureAvatarsDirectory(): Directory {
  const dir = avatarsDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

const expoAvatarFs: AvatarFs = {
  async copyFromUri(personId, sourceUri) {
    ensureAvatarsDirectory();
    const source = new File(sourceUri);
    await source.copy(avatarFile(personId), { overwrite: true });
  },
  deleteDir() {
    const dir = avatarsDirectory();
    if (dir.exists) {
      dir.delete();
    }
  },
  deleteFile(personId) {
    const file = avatarFile(personId);
    if (file.exists) {
      file.delete();
    }
  },
  async download(personId, url) {
    const dir = ensureAvatarsDirectory();
    const dest = new File(dir, `${personId}.jpg`);
    const tmp = new File(dir, `${personId}.tmp.jpg`);
    if (tmp.exists) {
      tmp.delete();
    }
    await File.createDownloadTask(url, tmp).downloadAsync();
    await tmp.move(dest, { overwrite: true });
  },
  fileExists(personId) {
    return avatarFile(personId).exists;
  },
  fileUri(personId) {
    const file = avatarFile(personId);
    return file.exists ? file.uri : null;
  },
};

const avatarFs: AvatarFs = expoAvatarFs;

function getAvatarDb(): AvatarSqlite {
  return getSyncDatabase() as unknown as AvatarSqlite;
}

function getLocalAvatarFileUri(personId: string): string | null {
  return avatarFs.fileUri(personId);
}

async function copyPickerFileToAvatar(personId: string, sourceUri: string): Promise<void> {
  await avatarFs.copyFromUri(personId, sourceUri);
}

function deleteLocalAvatarFile(personId: string): void {
  avatarFs.deleteFile(personId);
}

function deleteAvatarsDirectory(): void {
  avatarFs.deleteDir();
}

function markLocalAvatarAfterUpload(personId: string, avatarUrl: string | null): void {
  const clock = parseAvatarUpdatedAtFromUrl(avatarUrl);
  getAvatarDb().runSync(
    `UPDATE people
     SET has_avatar = 1, avatar_updated_at = ?, avatar_local_updated_at = ?
     WHERE id = ?`,
    clock,
    clock,
    personId,
  );
}

function markLocalAvatarRemoved(personId: string): void {
  getAvatarDb().runSync(
    `UPDATE people
     SET has_avatar = 0, avatar_updated_at = NULL, avatar_local_updated_at = NULL
     WHERE id = ?`,
    personId,
  );
  avatarFs.deleteFile(personId);
}

async function flushAvatarFileJobs(): Promise<boolean> {
  return runAvatarFileQueue({
    db: getAvatarDb(),
    fs: avatarFs,
    resolveRemoteUrl: resolveLocalContactAvatarUrl,
  });
}

export type {
  AvatarFileAction,
  AvatarFileRow,
  AvatarFs,
} from "./avatar-file-queue";
export {
  clearPendingAvatarJobs,
  decideAvatarFileAction,
  notePeopleAvatarDelete,
  notePeopleAvatarUpsert,
  resetPendingAvatarJobsForTests,
} from "./avatar-file-queue";
export {
  copyPickerFileToAvatar,
  deleteAvatarsDirectory,
  deleteLocalAvatarFile,
  flushAvatarFileJobs,
  getLocalAvatarFileUri,
  markLocalAvatarAfterUpload,
  markLocalAvatarRemoved,
};
