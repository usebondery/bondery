import AdmZip from "adm-zip";
import type { InstagramImportStrategy, InstagramPreparedContact } from "@bondery/types";

type UploadFile = {
  fileName: string;
  content: Buffer;
};

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
};

const FOLLOWING_FILE_NAME = "following.json";
const CLOSE_FRIENDS_FILE_NAME = "close_friends.json";
const FOLLOWERS_FILE_PATTERN = /^followers(?:_\d+)?\.json$/i;

const COMMON_BRANDS_NAME_TOKENS = [
  "prague",
  "praha",
  "michigan",
  "vse",
  "memes",
  "tracker",
  "news",
  "newsletter",
  "morningbrew",
  "spolek",
  "regrets",
  "thedeepview",
  "hubermanlab",
  "nike",
  "adidas",
  "puma",
  "reebok",
  "official",
  "hyrox",
  "crossfit",
  "fitness",
  "bodybuilder",
  "ohmyshhef",
  "officiel",
  "voluntia",
  "consulting",
  "consultant",
  "humor",
  "jokes",
  "vilgain",
  "chicas",
  "motorgen",
  "life",
  "umich",
  "ross",
  "international",
  "center",
  "people",
  "review",
  "umcfe",
  "coach",
  "institute",
  "brno",
  "city",
  "university",
  "app",
  "world",
  "visuals",
  "technology",
  "dogs",
  "dog",
  "czech",
  "visualize",
  "visual",
  "invest",
  "investovat",
  "investments",
  "inlist",
  "statistika",
  "stredoskolak",
  "chips",
  "code",
  "exist",
  "spolupracujeme",
  "economics",
  "traded",
  "francais",
  "party",
  "libertarian",
  "library",
  "muni",
  "academy",
  "learning",
  "university",
  "school",
  "education",
  "morningbrew",
  "stoic",
  "jaroska",
  "laws",
  "czechia",
  "czech",
  "seznamovak",
  "tuttletwinstv",
  "ucetnictvi",
  "finance",
  "interesting",
  "monk",
  "buzz",
  "engineering",
  "explaining",
  "rocketpengwin",
  "simple",
  "reidolson",
  "econ",
  "isti",
  "slovakia",
  "slovak",
  "teacher",
  "ycombinator",
  "zmena",
  "chartosaur",
  "bsecharly",
  "rekrabice",
  "startupy",
  "podnikatel",
  "arbor",
  "doucovani",
  "podnikat",
  "meetupy",
  "meetup",
  "meetups",
  "media",
  "notysek",
  "stories",
  "volley",
  "akce",
  "acoustics",
  "travel",
  "crunch",
  "virtute",
  "ilist",
  "typical",
  "crazy",
  "craziest",
  "greens",
  "idea",
  "mentor",
  "ministries",
  "france",
  "austrian",
  "simplicissimusyt",
  "stoa",
];
const COMMON_PERSON_NAME_TOKENS = [
  "aaron",
  "abigail",
  "adam",
  "joana",
  "alex",
  "ela",
  "tomik",

  "alice",
  "amanda",
  "schulz",
  "amelia",
  "andrew",
  "anna",
  "anthony",
  "ashley",
  "ava",
  "benjamin",
  "brandon",
  "brian",
  "charles",
  "chloe",
  "christopher",
  "daniel",
  "dan",
  "david",
  "elijah",
  "ella",
  "emily",
  "emma",
  "ethan",
  "evan",
  "gabriel",
  "grace",
  "hannah",
  "henry",
  "isabella",
  "jack",
  "jacob",
  "jackques",
  "james",
  "jason",
  "jennifer",
  "john",
  "jonathan",
  "joseph",
  "joshua",
  "katherine",
  "lauren",
  "liam",
  "logan",
  "lucas",
  "madison",
  "maria",
  "ellen",
  "mark",
  "mary",
  "mason",
  "matthew",
  "megan",
  "mia",
  "michael",
  "natalie",
  "nicholas",
  "noah",
  "olivia",
  "foto",
  "ryan",
  "samuel",
  "sarah",
  "smith",
  "sofia",
  "sophia",
  "thomas",
  "victoria",
  "william",
  "burger",
  "victor",
  "viziandrei",

  "adeline",
  "anne",

  "adrian",
  "jacques",
  "mai",

  "nic",
  "journal",

  "jose",

  "noel",
  "kveta",
  "john",
  "nguyen",
  "yvonne",
  "svancara",
  "andrej",
  "tobias",
  "vilem",
  "joanna",
  "kristian",
  "laura",
  "coufalova",
  "coufal",
  "bruno",
  "adam",
  "adela",
  "adriana",
  "ales",
  "vanessa",
  "vanesa",
  "phung",
  "max",
  "tommaso",
  "adel",
  "danik",
  "luciano",
  "albert",
  "matej",
  "aneta",
  "danko",
  "maty",
  "vojta",
  "radim",
  "alena",
  "alex",
  "kristy",
  "krysty",
  "chorvat",
  "dominik",
  "veronika",
  "verca",
  "maty",
  "robert",
  "dvorackova",
  "tomasek",
  "anna",
  "baru",
  "jacob",
  "barbora",
  "david",
  "denisa",
  "jonas",
  "dominika",
  "eliska",
  "eva",
  "filip",
  "frantisek",
  "honza",
  "hynek",
  "ivana",
  "jakub",
  "jan",
  "jana",
  "jaroslav",
  "jiri",
  "josef",
  "karolina",
  "katerina",
  "klara",
  "klarka",
  "kristyna",
  "lenka",
  "lucie",
  "lukas",
  "marek",
  "marie",
  "mario",
  "maruska",
  "maru",
  "patrick",
  "martin",
  "michal",
  "miroslav",
  "monika",
  "nikola",
  "tadeas",
  "elen",
  "novak",
  "novotny",
  "ondra",
  "ondrej",
  "pavel",
  "petr",
  "prochazka",
  "roman",
  "sabina",
  "simon",
  "stepan",
  "blazkova",
  "svoboda",
  "tereza",
  "tomas",
  "vaclav",
  "viktor",
  "vojtech",
  "zdenek",
];

const COMMON_NAME_TOKENS = new Set<string>(COMMON_PERSON_NAME_TOKENS);

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
  };
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

function parseNameFromUsername(username: string): {
  firstName: string;
  middleName: string | null;
  lastName: string;
} {
  const stripped = username.trim().replace(/^_+|_+$/g, "");
  const noNumbers = stripped.replace(/\d+/g, "");

  const tokens = noNumbers
    .split(/[._]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => toTitleCase(token));

  if (tokens.length === 0) {
    return {
      firstName: "Instagram",
      middleName: null,
      lastName: "Contact",
    };
  }

  if (tokens.length === 1) {
    const compactSplit = splitCompactUsernameToken(tokens[0].toLowerCase());

    if (compactSplit) {
      return {
        firstName: compactSplit[0],
        middleName: null,
        lastName: compactSplit[1],
      };
    }

    return {
      firstName: tokens[0],
      middleName: null,
      lastName: tokens[0],
    };
  }

  return {
    firstName: tokens[0],
    middleName: tokens.length > 2 ? tokens.slice(1, -1).join(" ") : null,
    lastName: tokens[tokens.length - 1],
  };
}

function toPreparedContacts(records: ParsedRecord[]): InstagramPreparedContact[] {
  return records.map((record, index) => {
    const parsedName = parseNameFromUsername(record.username);
    const issues: string[] = [];
    const likelyPerson = isLikelyPersonUsername(record.username);

    if (!record.username) {
      issues.push("Missing Instagram username");
    }

    if (!parsedName.firstName || !parsedName.lastName) {
      issues.push("Missing name derived from username");
    }

    return {
      tempId: `instagram-row-${index + 1}`,
      firstName: parsedName.firstName,
      middleName: parsedName.middleName,
      lastName: parsedName.lastName,
      instagramUrl: `https://www.instagram.com/${record.username}`,
      instagramUsername: record.username,
      likelyPerson,
      connectedAt: record.connectedAt,
      connectedOnRaw: record.connectedOnRaw,
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

  return entries.map(parseRelationshipItem).filter((item): item is ParsedRecord => item !== null);
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

  return entries.map(parseRelationshipItem).filter((item): item is ParsedRecord => item !== null);
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
    merged.push(...parsed);
  }

  return merged;
}

function deduplicateRecords(records: ParsedRecord[]): ParsedRecord[] {
  return Array.from(toMap(records).values());
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
      if (!followersByUsername.has(username)) {
        continue;
      }

      mutuals.push(followingRecord);
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
