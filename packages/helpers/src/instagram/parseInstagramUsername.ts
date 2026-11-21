import { COMMON_PERSON_NAME_TOKEN_SET } from "#name/common-person-name-tokens.js";

export interface ParsedInstagramName {
  firstName: string;
  lastName: string | null;
  middleName: string | null;
}

export interface ParseInstagramUsernameInput {
  displayName?: string | null;
  username: string;
}

const SMALL_CAPS_MAP: Record<string, string> = {
  x: "x",
  ǫ: "q",
  ɢ: "g",
  ɪ: "i",
  ɴ: "n",
  ʀ: "r",
  ʏ: "y",
  ʙ: "b",
  ʜ: "h",
  ʟ: "l",
  ᴀ: "a",
  ᴄ: "c",
  ᴅ: "d",
  ᴇ: "e",
  ᴊ: "j",
  ᴋ: "k",
  ᴍ: "m",
  ᴏ: "o",
  ᴘ: "p",
  ᴛ: "t",
  ᴜ: "u",
  ᴠ: "v",
  ᴡ: "w",
  ᴢ: "z",
  ꜰ: "f",
  ꜱ: "s",
};

const COMMON_NAME_TOKENS = COMMON_PERSON_NAME_TOKEN_SET;

function toTitleCase(token: string): string {
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function toNameCase(token: string): string {
  return token
    .split(/(['-])/)
    .map((part) => {
      if (part === "'" || part === "-") {
        return part;
      }

      return toTitleCase(part);
    })
    .join("");
}

function replaceSmallCaps(input: string): string {
  return input.replace(/[ᴀ-ᴢʙɢɪɴʀʏꜰꜱǫ]/gu, (character) => SMALL_CAPS_MAP[character] ?? character);
}

function normalizeDisplayName(displayName: string): string {
  const normalized = replaceSmallCaps(displayName)
    .normalize("NFKC")
    .replace(/[\p{Pd}\u2212]/gu, "-")
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035\u0060\u00B4\u02BC\u02BB\uFF07]/gu, "'");

  return normalized
    .replace(/[./_+|\\]+/g, " ")
    .replace(/[^\p{L}\p{M}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .normalize("NFC")
    .trim();
}

/** A token shorter than this cannot hold two name parts. */
const MIN_SPLITTABLE_TOKEN_LENGTH = 4;
/** Room the bridging vowel and a right part of at least two letters need at the end of a token. */
const MIN_BRIDGE_AND_RIGHT_LENGTH = 3;
/** A known name part next to an unknown one must be at least this long to count as a split. */
const MIN_KNOWN_PART_LENGTH = 3;
/** Split score bonuses. The base score is ten per letter, so a bonus decides only between near ties. */
const REPEATED_HALVES_SCORE_BONUS = 5;
const BOTH_KNOWN_SCORE_BONUS = 200;
const ONE_KNOWN_SCORE_BONUS = 80;
const RIGHT_KNOWN_SCORE_BONUS = 20;

function splitCompactUsernameToken(token: string): [string, string] | null {
  if (token.length < MIN_SPLITTABLE_TOKEN_LENGTH) {
    return null;
  }

  const normalized = token.toLowerCase();
  if (COMMON_NAME_TOKENS.has(normalized)) {
    return null;
  }

  const bridgingVowels = new Set(["a", "e", "i", "o", "u", "y"]);

  for (let index = 2; index <= normalized.length - MIN_BRIDGE_AND_RIGHT_LENGTH; index += 1) {
    const left = normalized.slice(0, index);
    const bridge = normalized.charAt(index);
    const right = normalized.slice(index + 1);

    if (!bridgingVowels.has(bridge)) {
      continue;
    }

    if (COMMON_NAME_TOKENS.has(left) && COMMON_NAME_TOKENS.has(right)) {
      return [toTitleCase(left), toTitleCase(right)];
    }
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

    if (
      leftKnown !== rightKnown &&
      (unknownPart.length === 0 || knownPart.length < MIN_KNOWN_PART_LENGTH)
    ) {
      continue;
    }

    if (leftKnown && rightKnown && (left.length < 2 || right.length < 2)) {
      continue;
    }

    if (/^(.)\1+$/u.test(left) || /^(.)\1+$/u.test(right)) {
      continue;
    }

    const isRepeated = left === right;
    const bothKnown = leftKnown && rightKnown;
    const oneKnown = leftKnown !== rightKnown;
    const score =
      (left.length + right.length) * 10 +
      (isRepeated ? REPEATED_HALVES_SCORE_BONUS : 0) +
      (bothKnown ? BOTH_KNOWN_SCORE_BONUS : 0) +
      (oneKnown ? ONE_KNOWN_SCORE_BONUS : 0) +
      (rightKnown ? RIGHT_KNOWN_SCORE_BONUS : 0) -
      Math.abs(left.length - right.length);

    candidates.push({ left, right, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates.at(0);
  if (!best) {
    return null;
  }
  return [toTitleCase(best.left), toTitleCase(best.right)];
}

function parseFromDisplayName(displayName?: string | null): ParsedInstagramName | null {
  if (!displayName?.trim()) {
    return null;
  }

  const normalized = normalizeDisplayName(displayName);
  if (!normalized) {
    return null;
  }

  const tokens = normalized
    .split(/[\s./_+|\\-]+/)
    .filter(Boolean)
    .map((token) => toNameCase(token));
  const firstName = tokens.at(0);
  const lastName = tokens.at(-1);
  if (firstName === undefined || lastName === undefined) {
    return null;
  }

  if (tokens.length === 1) {
    return {
      firstName,
      lastName: null,
      middleName: null,
    };
  }

  return {
    firstName,
    lastName,
    middleName: tokens.length > 2 ? tokens.slice(1, -1).join(" ") : null,
  };
}

function parseFromUsername(username: string): ParsedInstagramName {
  const stripped = username.trim().replace(/^_+|_+$/g, "");
  const noNumbers = stripped.replace(/\d+/g, "");

  const tokens = noNumbers
    .split(/[._-]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => toTitleCase(token));

  const firstName = tokens.at(0);
  const lastName = tokens.at(-1);
  if (firstName === undefined || lastName === undefined) {
    return {
      firstName: "Instagram",
      lastName: "Contact",
      middleName: null,
    };
  }

  if (tokens.length === 1) {
    const compactSplit = splitCompactUsernameToken(firstName.toLowerCase());

    if (compactSplit) {
      return {
        firstName: compactSplit[0],
        lastName: compactSplit[1],
        middleName: null,
      };
    }

    return {
      firstName,
      lastName: null,
      middleName: null,
    };
  }

  return {
    firstName,
    lastName,
    middleName: tokens.length > 2 ? tokens.slice(1, -1).join(" ") : null,
  };
}

/**
 * Parse Instagram identity into first/middle/last name.
 *
 * Strategy:
 * 1) Try to parse provided display name.
 * 2) If display name is missing or sanitizes to empty, fall back to username parsing.
 * 3) If only one token exists, return it as firstName.
 */
export function parseInstagramUsername(input: ParseInstagramUsernameInput): ParsedInstagramName {
  const fromDisplayName = parseFromDisplayName(input.displayName);
  if (fromDisplayName?.firstName) {
    return fromDisplayName;
  }

  return parseFromUsername(input.username);
}
