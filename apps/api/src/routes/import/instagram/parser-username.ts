import {
  COMMON_BRAND_NAME_TOKEN_SET as COMMON_BRANDS_NAME_TOKENS,
  COMMON_PERSON_NAME_TOKEN_SET as COMMON_NAME_TOKENS,
} from "@bondery/helpers/name";

const LEADING_AT_PATTERN = /^@+/;
const REPEATED_CHAR_PATTERN = /^(.)\1+$/u;
const HTTP_PROTOCOL_PATTERN = /^https?:\/\//i;
const DOT_UNDERSCORE_SEPARATOR_PATTERN = /[._]+/;

/** Shortest username the compact-name splitter tries to split. */
const MIN_COMPACT_USERNAME_LENGTH = 4;
/** When only one half is a known name, the known half must be at least this long. */
const MIN_KNOWN_NAME_PART_LENGTH = 3;
/** Shortest brand token matched as a substring of a username (shorter ones match too often). */
const MIN_EMBEDDED_BRAND_TOKEN_LENGTH = 7;

/** Split-score weights: longer total, then name evidence, then balanced halves. */
const SPLIT_SCORE_LENGTH_WEIGHT = 10;
const SPLIT_SCORE_REPEATED_BONUS = 5;
const SPLIT_SCORE_BOTH_KNOWN_BONUS = 200;
const SPLIT_SCORE_ONE_KNOWN_BONUS = 80;
const SPLIT_SCORE_RIGHT_KNOWN_BONUS = 20;

function toTitleCase(token: string): string {
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function splitCompactUsernameToken(token: string): [string, string] | null {
  if (token.length < MIN_COMPACT_USERNAME_LENGTH) {
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

    if (
      leftKnown !== rightKnown &&
      (unknownPart.length === 0 || knownPart.length < MIN_KNOWN_NAME_PART_LENGTH)
    ) {
      continue;
    }

    if (leftKnown && rightKnown && (left.length < 2 || right.length < 2)) {
      continue;
    }

    if (REPEATED_CHAR_PATTERN.test(unknownPart)) {
      continue;
    }

    const isRepeated = left === right;
    const bothKnown = leftKnown && rightKnown;
    const oneKnown = leftKnown !== rightKnown;
    const score =
      (left.length + right.length) * SPLIT_SCORE_LENGTH_WEIGHT +
      (isRepeated ? SPLIT_SCORE_REPEATED_BONUS : 0) +
      (bothKnown ? SPLIT_SCORE_BOTH_KNOWN_BONUS : 0) +
      (oneKnown ? SPLIT_SCORE_ONE_KNOWN_BONUS : 0) +
      (rightKnown ? SPLIT_SCORE_RIGHT_KNOWN_BONUS : 0) -
      Math.abs(left.length - right.length);

    candidates.push({ left, right, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (!best) {
    return null;
  }

  return [toTitleCase(best.left), toTitleCase(best.right)];
}

function hasLikelyPersonSignal(normalizedUsername: string): boolean {
  const parts = normalizedUsername.split(DOT_UNDERSCORE_SEPARATOR_PATTERN).filter(Boolean);

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
  const parts = normalizedUsername.split(DOT_UNDERSCORE_SEPARATOR_PATTERN).filter(Boolean);

  for (const brandToken of COMMON_BRANDS_NAME_TOKENS) {
    if (
      parts.some(
        (part) => part === brandToken || part.startsWith(brandToken) || part.endsWith(brandToken),
      )
    ) {
      return true;
    }

    if (
      brandToken.length >= MIN_EMBEDDED_BRAND_TOKEN_LENGTH &&
      normalizedUsername.includes(brandToken)
    ) {
      return true;
    }
  }

  return false;
}

export function normalizeHandle(rawHandle: string): string {
  return rawHandle.trim().replace(LEADING_AT_PATTERN, "").toLowerCase();
}

export function normalizeUsernameFromHref(href: string): string | null {
  try {
    const withProtocol = HTTP_PROTOCOL_PATTERN.test(href) ? href : `https://${href}`;
    const parsed = new URL(withProtocol);
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (segments.length === 0) {
      return null;
    }

    const uSegmentIndex = segments.findIndex((segment) => segment.toLowerCase() === "_u");
    const afterUSegment = segments[uSegmentIndex + 1];
    const username = uSegmentIndex >= 0 && afterUSegment ? afterUSegment : (segments.at(-1) ?? "");

    const normalized = normalizeHandle(username);
    return normalized || null;
  } catch {
    return null;
  }
}

export function isLikelyPersonUsername(username: string): boolean {
  const normalized = normalizeHandle(username);

  if (!normalized) {
    return false;
  }

  if (hasLikelyPersonSignal(normalized)) {
    return true;
  }

  return !hasLikelyBrandSignal(normalized);
}
