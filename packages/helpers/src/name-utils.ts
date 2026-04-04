/**
 * Name parsing and cleaning utilities shared across import flows and the redirect API.
 */

const NAME_TITLE_TOKENS = new Set([
  "doc",
  "doc.",
  "ing",
  "ing.",
  "bc",
  "bc.",
  "mgr",
  "mgr.",
  "judr",
  "judr.",
  "mudr",
  "mudr.",
  "rndr",
  "rndr.",
  "phdr",
  "phdr.",
  "phd",
  "phd.",
  "ph.d",
  "ph.d.",
  "dphil",
  "dr",
  "dr.",
  "prof",
  "prof.",
  "mba",
  "mba.",
  "ma",
  "ma.",
  "msc",
  "msc.",
  "bsc",
  "bsc.",
  "cpa",
  "cpa.",
  "esq",
  "esq.",
  "jd",
  "jd.",
  "md",
  "md.",
  "dds",
  "dds.",
]);

/**
 * Unwraps parenthetical segments from a name string by removing the brackets
 * but keeping the content inside them.
 * e.g. "Middlename (Lastname)" → "Middlename Lastname"
 * Collapses resulting extra whitespace.
 *
 * @param value Name string potentially containing parenthetical parts.
 * @returns Name string with parentheses removed but their content preserved.
 */
export function stripNameParentheticals(value: string): string {
  return value
    .replace(/\(([^)]*)\)/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Removes emoji characters from a string, including:
 * - Standard / ZWJ-compound pictographic emoji (😀, 👨‍👩‍👧, etc.)
 * - Flag emoji (🇺🇸, 🇨🇿, etc.) which are pairs of Regional Indicator letters
 * Collapses resulting extra whitespace.
 */
export function stripEmojis(value: string): string {
  return value
    .replace(/\p{Regional_Indicator}+/gu, "") // flag emoji (pairs of RI symbols)
    .replace(/\p{Extended_Pictographic}(\u200D\p{Extended_Pictographic})*/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeNameToken(token: string): string {
  return token.trim().replace(/,$/, "").toLowerCase();
}

/**
 * Strips common academic/professional title prefixes and suffixes from a name string.
 *
 * @param rawName Raw name string which may contain titles.
 * @returns Name string with leading/trailing title tokens removed.
 */
export function stripNameTitles(rawName: string): string {
  const words = rawName.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "";
  }

  let start = 0;
  let end = words.length - 1;

  while (start <= end && NAME_TITLE_TOKENS.has(normalizeNameToken(words[start]))) {
    start += 1;
  }

  while (end >= start && NAME_TITLE_TOKENS.has(normalizeNameToken(words[end]))) {
    end -= 1;
  }

  return words
    .slice(start, end + 1)
    .map((w) => w.replace(/,$/, "")) // strip trailing commas left by "Name, TITLE" patterns
    .join(" ")
    .trim();
}

/**
 * Splits a last-name field that may contain a middle name into its parts.
 * LinkedIn exports the last name field as "Middle Last", so the final word
 * is treated as the last name and any preceding words as the middle name.
 *
 * @param lastNameInput Raw last-name string from the data source.
 * @returns Object with `middleName` (nullable) and `lastName`.
 */
export function extractNameParts(lastNameInput: string): {
  middleName: string | null;
  lastName: string;
} {
  const words = lastNameInput.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return { middleName: null, lastName: "" };
  }

  if (words.length === 1) {
    return { middleName: null, lastName: words[0] };
  }

  return {
    middleName: words[words.length - 2],
    lastName: words[words.length - 1],
  };
}

/**
 * Normalizes the casing of a name string.
 * Tokens that are entirely uppercase and longer than one character are converted
 * to title case (e.g. "ALEXANDRO" → "Alexandro").
 * Tokens that are already mixed-case (e.g. "McDonald", "O'Brien") are left untouched
 * to avoid mangling legitimate casing.
 * Single-character tokens (initials) are also left unchanged.
 *
 * @param name Cleaned name string (after emoji/title stripping).
 * @returns Name string with all-caps tokens converted to title case.
 */
export function normalizeNameCase(name: string): string {
  return name
    .split(/\s+/)
    .map((token) => {
      if (token.length > 1 && token === token.toUpperCase()) {
        return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
      }
      return token;
    })
    .join(" ");
}

/**
 * Fully cleans a raw name string: strips emojis then strips academic titles.
 *
 * @param rawName Raw name from external source.
 * @returns Cleaned name string (may be empty if the input was only emojis/titles).
 */
export function cleanPersonName(rawName: string | null | undefined): string {
  if (!rawName || typeof rawName !== "string") return "";
  return stripNameTitles(stripEmojis(rawName.trim()));
}
