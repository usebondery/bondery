import { transliterate } from "transliteration";

export interface ParsedInstagramName {
  firstName: string;
  middleName: string | null;
  lastName: string | null;
}

export interface ParseInstagramUsernameInput {
  displayName?: string | null;
  username: string;
}

const SMALL_CAPS_MAP: Record<string, string> = {
  ᴀ: "a",
  ʙ: "b",
  ᴄ: "c",
  ᴅ: "d",
  ᴇ: "e",
  ꜰ: "f",
  ɢ: "g",
  ʜ: "h",
  ɪ: "i",
  ᴊ: "j",
  ᴋ: "k",
  ʟ: "l",
  ᴍ: "m",
  ɴ: "n",
  ᴏ: "o",
  ᴘ: "p",
  ǫ: "q",
  ʀ: "r",
  ꜱ: "s",
  ᴛ: "t",
  ᴜ: "u",
  ᴠ: "v",
  ᴡ: "w",
  x: "x",
  ʏ: "y",
  ᴢ: "z",
};

const COMMON_NAME_TOKENS = new Set<string>([
  "adam",
  "adela",
  "alex",
  "anna",
  "andrej",
  "andrea",
  "daniel",
  "david",
  "eva",
  "jakub",
  "jana",
  "jan",
  "jiri",
  "joao",
  "jose",
  "katerina",
  "lucie",
  "maria",
  "martin",
  "matyas",
  "michael",
  "michel",
  "nikola",
  "ondrej",
  "pavel",
  "petra",
  "petr",
  "silva",
  "svoboda",
  "tomas",
  "vaclav",
  "janku",
  "novak",
  "novakova",
]);

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
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035\u0060\u00B4\u02BC\u02BB\uFF07]/gu, "'")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "");

  const transliterated = transliterate(normalized, {
    unknown: "",
  });

  return transliterated
    .replace(/[./_+|\\]+/g, " ")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^A-Za-z\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitCompactUsernameToken(token: string): [string, string] | null {
  if (token.length < 4) {
    return null;
  }

  const normalized = token.toLowerCase();
  if (COMMON_NAME_TOKENS.has(normalized)) {
    return null;
  }

  const bridgingVowels = new Set(["a", "e", "i", "o", "u", "y"]);

  for (let index = 2; index <= normalized.length - 3; index += 1) {
    const left = normalized.slice(0, index);
    const bridge = normalized[index];
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

    if (leftKnown !== rightKnown && (unknownPart.length < 1 || knownPart.length < 3)) {
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

function parseFromDisplayName(displayName?: string | null): ParsedInstagramName | null {
  if (!displayName || !displayName.trim()) {
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
  if (tokens.length === 0) {
    return null;
  }

  if (tokens.length === 1) {
    return {
      firstName: tokens[0],
      middleName: null,
      lastName: null,
    };
  }

  return {
    firstName: tokens[0],
    middleName: tokens.length > 2 ? tokens.slice(1, -1).join(" ") : null,
    lastName: tokens[tokens.length - 1],
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
      lastName: null,
    };
  }

  return {
    firstName: tokens[0],
    middleName: tokens.length > 2 ? tokens.slice(1, -1).join(" ") : null,
    lastName: tokens[tokens.length - 1],
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
  if (fromDisplayName && fromDisplayName.firstName) {
    return fromDisplayName;
  }

  return parseFromUsername(input.username);
}
