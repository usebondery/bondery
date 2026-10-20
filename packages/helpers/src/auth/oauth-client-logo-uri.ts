/** HTTPS `logo_uri` from OAuth client metadata (stored as `oauth_client.icon`). */
export function resolveOAuthClientLogoUri(icon: string | null | undefined): string | null {
  const trimmed = icon?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}
