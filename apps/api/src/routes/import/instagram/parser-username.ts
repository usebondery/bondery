import {
  COMMON_BRAND_NAME_TOKEN_SET as COMMON_BRANDS_NAME_TOKENS,
  COMMON_PERSON_NAME_TOKEN_SET as COMMON_NAME_TOKENS,
} from "@bondery/helpers/name";

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

export function normalizeHandle(rawHandle: string): string {
  return rawHandle.trim().replace(/^@+/, "").toLowerCase();
}

export function normalizeUsernameFromHref(href: string): string | null {
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
