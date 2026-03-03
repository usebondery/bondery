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
  "ph.d",
  "ph.d.",
  "dphil",
  "dr",
  "dr.",
  "prof",
  "prof.",
  "mba",
  "ma",
  "msc",
  "bsc",
  "cpa",
  "esq",
  "esq.",
  "jd",
  "md",
  "dds",
]);

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
 * Fully cleans a raw name string: strips emojis then strips academic titles.
 *
 * @param rawName Raw name from external source.
 * @returns Cleaned name string (may be empty if the input was only emojis/titles).
 */
export function cleanPersonName(rawName: string | null | undefined): string {
  if (!rawName || typeof rawName !== "string") return "";
  return stripNameTitles(stripEmojis(rawName.trim()));
}
