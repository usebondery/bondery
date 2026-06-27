/**
 * Normalizes a website URL for storage and linking.
 * Returns empty string when cleared, null when invalid.
 */
export function normalizeWebsiteUrl(value: string): string | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  const candidate = /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;

  try {
    const parsedUrl = new URL(candidate);
    const isHttpProtocol = parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";

    if (!isHttpProtocol || !parsedUrl.hostname.includes(".")) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}
