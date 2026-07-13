import { parseInstagramUsername, SOCIAL_PLATFORM_URL_DETAILS } from "@bondery/helpers";
import type {
  InstagramImportSource,
  InstagramImportStrategy,
  InstagramPreparedContact,
} from "@bondery/schemas";
import type { UploadFile } from "../../../lib/data/select-fragments.js";
import {
  isLikelyPersonUsername,
  normalizeHandle,
  normalizeUsernameFromHref,
} from "./parser-username.js";

export type InstagramStringData = {
  href?: unknown;
  value?: unknown;
  timestamp?: unknown;
};

export type InstagramRelationshipItem = {
  title?: unknown;
  string_list_data?: unknown;
};

type FollowingExport = {
  relationships_following?: unknown;
};

type CloseFriendsExport = {
  relationships_close_friends?: unknown;
};

export type ParsedRecord = {
  username: string;
  connectedAt: string | null;
  connectedOnRaw: number | null;
  sources: InstagramImportSource[];
};

export const FOLLOWING_FILE_NAME = "following.json";
export const CLOSE_FRIENDS_FILE_NAME = "close_friends.json";
export const FOLLOWERS_FILE_PATTERN = /^followers(?:_\d+)?\.json$/i;

export function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").toLowerCase();
}

export function baseName(path: string): string {
  const normalized = normalizePath(path);
  const chunks = normalized.split("/").filter(Boolean);
  return chunks[chunks.length - 1] || normalized;
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
    connectedAt: iso,
    connectedOnRaw: raw,
    sources: [],
    username: normalizedUsername,
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

export function toPreparedContacts(records: ParsedRecord[]): InstagramPreparedContact[] {
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
      alreadyExists: false,
      connectedAt: record.connectedAt,
      connectedOnRaw: record.connectedOnRaw,
      firstName: parsedName.firstName,
      instagramUrl: `${SOCIAL_PLATFORM_URL_DETAILS.instagram.profileBaseUrlWithWww}${record.username}`,
      instagramUsername: record.username,
      issues,
      isValid: issues.length === 0,
      lastName: parsedName.lastName ?? "",
      likelyPerson,
      middleName: parsedName.middleName,
      sources: record.sources,
      tempId: `instagram-row-${index + 1}`,
    };
  });
}

export function parseJsonFile<T>(file: UploadFile): T {
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

export function findJsonFile(files: UploadFile[], targetName: string): UploadFile | null {
  return files.find((file) => baseName(file.fileName) === targetName) || null;
}

export function findFollowerJsonFiles(files: UploadFile[]): UploadFile[] {
  return files.filter((file) => FOLLOWERS_FILE_PATTERN.test(baseName(file.fileName)));
}

export function parseFollowingRecords(files: UploadFile[], required = true): ParsedRecord[] {
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

export function parseCloseFriendsRecords(files: UploadFile[]): ParsedRecord[] {
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

export function parseFollowersRecords(files: UploadFile[], required = true): ParsedRecord[] {
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

export function deduplicateRecords(records: ParsedRecord[]): ParsedRecord[] {
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

export function buildStrategyRecords(
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
