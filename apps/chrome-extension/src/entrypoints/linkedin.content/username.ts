/** Extracts the LinkedIn vanity handle from the current profile URL. */

export function getLinkedInUsername(): string | null {
  const pathname = window.location.pathname;
  const match = pathname.match(/^\/in\/([^/]+)\/?$/);

  if (match?.[1]) {
    // Decode percent-encoded handles (e.g. "ad%C3%A9la" → "adéla")
    // so we always work with the human-readable form.
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }

  return null;
}
