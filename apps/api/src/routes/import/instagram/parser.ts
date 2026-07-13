import type { InstagramImportStrategy, InstagramPreparedContact } from "@bondery/schemas";
import AdmZip from "adm-zip";
import type { UploadFile } from "../../../lib/data/select-fragments.js";
import {
  buildStrategyRecords,
  normalizePath,
  parseCloseFriendsRecords,
  parseFollowersRecords,
  parseFollowingRecords,
  toPreparedContacts,
} from "./parser-records.js";

function extractFromZip(files: UploadFile[]): UploadFile[] {
  const zipFile = files.find((file) => normalizePath(file.fileName).endsWith(".zip"));

  if (!zipFile) {
    return files;
  }

  const zip = new AdmZip(zipFile.content);
  return zip
    .getEntries()
    .filter((entry) => !entry.isDirectory)
    .map((entry) => ({
      content: entry.getData(),
      fileName: entry.entryName,
    }));
}

/**
 * Parses Instagram export upload files and returns normalized proposed contacts for import.
 *
 * @param files Uploaded ZIP/folder files from the importer UI.
 * @param strategy Selected import strategy used to choose source records.
 * @returns Prepared contacts ready for preview and commit.
 */
export function parseInstagramExportUpload(
  files: UploadFile[],
  strategy: InstagramImportStrategy,
): InstagramPreparedContact[] {
  if (files.length === 0) {
    throw new Error("No files uploaded");
  }

  const extractedFiles = extractFromZip(files);

  const needsFollowing =
    strategy === "following" ||
    strategy === "following_and_followers" ||
    strategy === "mutual_following" ||
    strategy === "close_friends";
  const needsFollowers =
    strategy === "followers" ||
    strategy === "following_and_followers" ||
    strategy === "mutual_following";
  const needsCloseFriends = strategy === "close_friends";

  const followingRecords = parseFollowingRecords(extractedFiles, needsFollowing);
  const followersRecords = parseFollowersRecords(extractedFiles, needsFollowers);
  const closeFriendsRecords = needsCloseFriends ? parseCloseFriendsRecords(extractedFiles) : [];

  const strategyRecords = buildStrategyRecords(
    strategy,
    followingRecords,
    followersRecords,
    closeFriendsRecords,
  );

  return toPreparedContacts(strategyRecords);
}
