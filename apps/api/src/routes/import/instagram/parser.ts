import AdmZip from "adm-zip";
import type {
  InstagramImportSource,
  InstagramImportStrategy,
  InstagramPreparedContact,
} from "@bondery/types";
import { parseInstagramUsername, SOCIAL_PLATFORM_URL_DETAILS } from "@bondery/helpers";
import {
  COMMON_BRAND_NAME_TOKEN_SET as COMMON_BRANDS_NAME_TOKENS,
  COMMON_PERSON_NAME_TOKEN_SET as COMMON_NAME_TOKENS,
} from "@bondery/helpers/name";
import type { UploadFile } from "../../../lib/schemas.js";

type InstagramStringData = {
  href?: unknown;
  value?: unknown;
  timestamp?: unknown;
};

type InstagramRelationshipItem = {
  title?: unknown;
  string_list_data?: unknown;
};

type FollowingExport = {
  relationships_following?: unknown;
};

type CloseFriendsExport = {
  relationships_close_friends?: unknown;
};

type ParsedRecord = {
  username: string;
  connectedAt: string | null;
  connectedOnRaw: number | null;
  sources: InstagramImportSource[];
};

const FOLLOWING_FILE_NAME = "following.json";
const CLOSE_FRIENDS_FILE_NAME = "close_friends.json";
const FOLLOWERS_FILE_PATTERN = /^followers(?:_\d+)?\.json$/i;

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").toLowerCase();
}

function baseName(path: string): string {
  const normalized = normalizePath(path);
  const chunks = normalized.split("/").filter(Boolean);
  return chunks[chunks.length - 1] || normalized;
}

function normalizeHandle(rawHandle: string): string {
  return rawHandle.trim().replace(/^@+/, "").toLowerCase();
}

function toTitleCase(token: string): string {
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function splitCompactUsernameToken(token: string): [string, string] | null {
  if (token.length < 4) {
    return null;
  }

  const normalized = token.toLowerCase();

  if (COMMON_NAME_TOKENS.has(normalized)) {
    return null;
  }

  const candidates: Array<{ left: string; right: string; score: number }> = [];

  for (let index = 1; index <= normalized.length - 1; index += 1) {
    const left = normalized.slice(0, index);
    const right = normalized.slice(index);

    const leftKnown = COMMON_NAME_TOKENS.has(left);
    const rightKnown = COMMON_NAME_TOKENS.has(right);

    if (!leftKnown && !rightKnown) {
      continue;
    }

    const unknownPart = leftKnown ? right : left;
    const knownPart = leftKnown ? left : right;

    if (leftKnown !== rightKnown && (unknownPart.length < 1 || knownPart.length < 3)) {
      continue;
    }

    if (leftKnown && rightKnown && (left.length < 2 || right.length < 2)) {
      continue;
    }

    if (/^(.)\1+$/u.test(unknownPart)) {
      continue;
    }

    const isRepeated = left === right;
    const bothKnown = leftKnown && rightKnown;
    const oneKnown = leftKnown !== rightKnown;
    const score =
      (left.length + right.length) * 10 +
      (isRepeated ? 5 : 0) +
      (bothKnown ? 200 : 0) +
      (oneKnown ? 80 : 0) +
      (rightKnown ? 20 : 0) -
      Math.abs(left.length - right.length);

    candidates.push({ left, right, score });
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.score - a.score);
  return [toTitleCase(candidates[0].left), toTitleCase(candidates[0].right)];
}

function hasLikelyPersonSignal(normalizedUsername: string): boolean {
  const parts = normalizedUsername.split(/[._]+/).filter(Boolean);

  for (const part of parts) {
    if (COMMON_NAME_TOKENS.has(part)) {
      return true;
    }

    if (splitCompactUsernameToken(part)) {
      return true;
    }
  }

  return false;
}

function hasLikelyBrandSignal(normalizedUsername: string): boolean {
  const parts = normalizedUsername.split(/[._]+/).filter(Boolean);

  for (const brandToken of COMMON_BRANDS_NAME_TOKENS) {
    if (
      parts.some(
        (part) => part === brandToken || part.startsWith(brandToken) || part.endsWith(brandToken),
      )
    ) {
      return true;
    }

    if (brandToken.length >= 7 && normalizedUsername.includes(brandToken)) {
      return true;
    }
  }

  return false;
}

function normalizeUsernameFromHref(href: string): string | null {
  try {
    const withProtocol = /^https?:\/\//i.test(href) ? href : `https://${href}`;
    const parsed = new URL(withProtocol);
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (segments.length === 0) {
      return null;
    }

    const uSegmentIndex = segments.findIndex((segment) => segment.toLowerCase() === "_u");
    const username =
      uSegmentIndex >= 0 && segments[uSegmentIndex + 1]
        ? segments[uSegmentIndex + 1]
        : segments[segments.length - 1];

    const normalized = normalizeHandle(username);
    return normalized || null;
  } catch {
    return null;
  }
}

function isLikelyPersonUsername(username: string): boolean {
  const normalized = normalizeHandle(username);

  if (!normalized) {
    return false;
  }

  if (hasLikelyPersonSignal(normalized)) {
    return true;
  }

  return !hasLikelyBrandSignal(normalized);
}

function parseTimestampToDate(timestampValue: unknown): { iso: string | null; raw: number | null } {
  if (typeof timestampValue !== "number" || !Number.isFinite(timestampValue)) {
    return { iso: null, raw: null };
  }

  const timestamp = Math.trunc(timestampValue);
  if (timestamp <= 0) {
    return { iso: null, raw: timestamp };
  }

  return {
    iso: new Date(timestamp * 1000).toISOString(),
    raw: timestamp,
  };
}

function toStringListData(input: unknown): InstagramStringData[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((item) => typeof item === "object" && item !== null) as InstagramStringData[];
}

function validateObject(input: unknown, fileLabel: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error(`${fileLabel} has invalid JSON structure`);
  }

  return input as Record<string, unknown>;
}

function ensureRelationshipArray(
  input: unknown,
  key: string,
  fileLabel: string,
): InstagramRelationshipItem[] {
  const objectShape = validateObject(input, fileLabel) as Record<string, unknown>;
  const value = objectShape[key];

  if (!Array.isArray(value)) {
    throw new Error(`${fileLabel} is missing ${key} array`);
  }

  return value.filter(
    (item) => typeof item === "object" && item !== null,
  ) as InstagramRelationshipItem[];
}

function ensureFollowersArray(input: unknown, fileLabel: string): InstagramRelationshipItem[] {
  if (!Array.isArray(input)) {
    throw new Error(`${fileLabel} has invalid followers structure`);
  }

  return input.filter(
    (item) => typeof item === "object" && item !== null,
  ) as InstagramRelationshipItem[];
}

function parseRelationshipItem(item: InstagramRelationshipItem): ParsedRecord | null {
  const title = typeof item.title === "string" ? item.title : "";
  const stringData = toStringListData(item.string_list_data);
  const primary = stringData[0] || {};

  const value = typeof primary.value === "string" ? primary.value : "";
  const href = typeof primary.href === "string" ? primary.href : "";

  const titleHandle = normalizeHandle(title);
  const valueHandle = normalizeHandle(value);
  const hrefHandle = href ? normalizeUsernameFromHref(href) : null;

  const username = titleHandle || valueHandle || hrefHandle || "";
  const normalizedUsername = normalizeHandle(username);

  if (!normalizedUsername) {
    return null;
  }

  const { iso, raw } = parseTimestampToDate(primary.timestamp);

  return {
    username: normalizedUsername,
    connectedAt: iso,
    connectedOnRaw: raw,
    sources: [],
  };
}

function withSource(records: ParsedRecord[], source: InstagramImportSource): ParsedRecord[] {
  return records.map((record) => ({
    ...record,
    sources: [source],
  }));
}

function toMap(records: ParsedRecord[]): Map<string, ParsedRecord> {
  const map = new Map<string, ParsedRecord>();

  for (const record of records) {
    if (!record.username) {
      continue;
    }

    map.set(record.username, record);
  }

  return map;
}

function toPreparedContacts(records: ParsedRecord[]): InstagramPreparedContact[] {
  return records.map((record, index) => {
    const parsedName = parseInstagramUsername({ username: record.username });
    const issues: string[] = [];
    const likelyPerson = isLikelyPersonUsername(record.username);

    if (!record.username) {
      issues.push("Missing Instagram username");
    }

    if (!parsedName.firstName) {
      issues.push("Missing name derived from username");
    }

    return {
      tempId: `instagram-row-${index + 1}`,
      firstName: parsedName.firstName,
      middleName: parsedName.middleName,
      lastName: parsedName.lastName ?? "",
      instagramUrl: `${SOCIAL_PLATFORM_URL_DETAILS.instagram.profileBaseUrlWithWww}${record.username}`,
      instagramUsername: record.username,
      alreadyExists: false,
      likelyPerson,
      connectedAt: record.connectedAt,
      connectedOnRaw: record.connectedOnRaw,
      sources: record.sources,
      isValid: issues.length === 0,
      issues,
    };
  });
}

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
      fileName: entry.entryName,
      content: entry.getData(),
    }));
}

function findJsonFile(files: UploadFile[], targetName: string): UploadFile | null {
  return files.find((file) => baseName(file.fileName) === targetName) || null;
}

function findFollowerJsonFiles(files: UploadFile[]): UploadFile[] {
  return files.filter((file) => FOLLOWERS_FILE_PATTERN.test(baseName(file.fileName)));
}

function parseJsonFile<T>(file: UploadFile): T {
  const rawContent = file.content
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trim();

  try {
    return JSON.parse(rawContent) as T;
  } catch {
    throw new Error(`${baseName(file.fileName)} contains invalid JSON`);
  }
}

function parseFollowingRecords(files: UploadFile[], required = true): ParsedRecord[] {
  const followingFile = findJsonFile(files, FOLLOWING_FILE_NAME);

  if (!followingFile) {
    if (!required) {
      return [];
    }

    throw new Error(`${FOLLOWING_FILE_NAME} was not found in uploaded files`);
  }

  const payload = parseJsonFile<FollowingExport>(followingFile);
  const entries = ensureRelationshipArray(payload, "relationships_following", FOLLOWING_FILE_NAME);

  const parsed = entries
    .map(parseRelationshipItem)
    .filter((item): item is ParsedRecord => item !== null);

  return withSource(parsed, "following");
}

function parseCloseFriendsRecords(files: UploadFile[]): ParsedRecord[] {
  const closeFriendsFile = findJsonFile(files, CLOSE_FRIENDS_FILE_NAME);

  if (!closeFriendsFile) {
    throw new Error(`${CLOSE_FRIENDS_FILE_NAME} was not found in uploaded files`);
  }

  const payload = parseJsonFile<CloseFriendsExport>(closeFriendsFile);
  const entries = ensureRelationshipArray(
    payload,
    "relationships_close_friends",
    CLOSE_FRIENDS_FILE_NAME,
  );

  const parsed = entries
    .map(parseRelationshipItem)
    .filter((item): item is ParsedRecord => item !== null);

  return withSource(parsed, "close_friends");
}

function parseFollowersRecords(files: UploadFile[], required = true): ParsedRecord[] {
  const followerFiles = findFollowerJsonFiles(files);

  if (followerFiles.length === 0) {
    if (!required) {
      return [];
    }

    throw new Error("No followers_*.json files were found in uploaded files");
  }

  const merged: ParsedRecord[] = [];

  for (const followerFile of followerFiles) {
    const payload = parseJsonFile<unknown>(followerFile);
    const entries = ensureFollowersArray(payload, baseName(followerFile.fileName));
    const parsed = entries
      .map(parseRelationshipItem)
      .filter((item): item is ParsedRecord => item !== null);
    merged.push(...withSource(parsed, "followers"));
  }

  return merged;
}

function deduplicateRecords(records: ParsedRecord[]): ParsedRecord[] {
  const map = new Map<string, ParsedRecord>();

  for (const record of records) {
    const existing = map.get(record.username);

    if (!existing) {
      map.set(record.username, {
        ...record,
        sources: Array.from(new Set(record.sources)),
      });
      continue;
    }

    const mergedSources = Array.from(new Set([...existing.sources, ...record.sources]));

    const existingRaw = existing.connectedOnRaw ?? Number.MIN_SAFE_INTEGER;
    const incomingRaw = record.connectedOnRaw ?? Number.MIN_SAFE_INTEGER;

    if (incomingRaw > existingRaw) {
      map.set(record.username, {
        ...record,
        sources: mergedSources,
      });
      continue;
    }

    map.set(record.username, {
      ...existing,
      sources: mergedSources,
    });
  }

  return Array.from(map.values());
}

function buildStrategyRecords(
  strategy: InstagramImportStrategy,
  followingRecords: ParsedRecord[],
  followersRecords: ParsedRecord[],
  closeFriendsRecords: ParsedRecord[],
): ParsedRecord[] {
  const followingByUsername = toMap(followingRecords);
  const followersByUsername = toMap(followersRecords);

  if (strategy === "following") {
    return deduplicateRecords(followingRecords);
  }

  if (strategy === "followers") {
    return deduplicateRecords(followersRecords);
  }

  if (strategy === "following_and_followers") {
    return deduplicateRecords([...followingRecords, ...followersRecords]);
  }

  if (strategy === "mutual_following") {
    const mutuals: ParsedRecord[] = [];

    for (const [username, followingRecord] of followingByUsername.entries()) {
      const followerRecord = followersByUsername.get(username);
      if (!followerRecord) {
        continue;
      }

      mutuals.push(followingRecord);
      mutuals.push(followerRecord);
    }

    return deduplicateRecords(mutuals);
  }

  const closeFriendsWithTimestamp = closeFriendsRecords.map((record) => {
    const followingRecord = followingByUsername.get(record.username);
    if (followingRecord?.connectedOnRaw) {
      return followingRecord;
    }

    const followerRecord = followersByUsername.get(record.username);
    if (followerRecord?.connectedOnRaw) {
      return {
        ...record,
        connectedAt: followerRecord.connectedAt,
        connectedOnRaw: followerRecord.connectedOnRaw,
      };
    }

    return record;
  });

  return deduplicateRecords(closeFriendsWithTimestamp);
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
