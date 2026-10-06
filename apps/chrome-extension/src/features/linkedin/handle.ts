/** Normalise a LinkedIn vanity handle from a slug, encoded slug, or profile URL. */

export function normalizeLinkedInVanityHandle(value: string): string {
  let handle = value.trim();
  try {
    handle = decodeURIComponent(handle);
  } catch {
    // Keep the trimmed value when it is not percent-encoded.
  }

  const fromPath = handle.match(/\/in\/([^/?#]+)/i);
  if (fromPath?.[1]) {
    handle = fromPath[1];
    try {
      handle = decodeURIComponent(handle);
    } catch {
      // Already decoded.
    }
  }

  return handle.normalize("NFC");
}

export function linkedInHandlesMatch(left: string, right: string): boolean {
  return (
    normalizeLinkedInVanityHandle(left).toLowerCase() ===
    normalizeLinkedInVanityHandle(right).toLowerCase()
  );
}

export function linkedInProfileUrl(handle: string): string {
  return `https://www.linkedin.com/in/${encodeURIComponent(normalizeLinkedInVanityHandle(handle))}/`;
}

export function getLinkedInUsernameFromPathname(pathname: string): string | null {
  const match = pathname.match(/\/in\/([^/]+)/i);
  if (!match?.[1]) {
    return null;
  }
  const vanity = normalizeLinkedInVanityHandle(match[1]);
  return vanity.length > 0 ? vanity : null;
}
