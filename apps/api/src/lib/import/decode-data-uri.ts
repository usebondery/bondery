/**
 * Decodes a data URI (e.g. from an embedded vCard photo) into a buffer and media type.
 */

const DATA_URI_PATTERN = /^data:([^;]+);base64,(.+)$/;
export function decodeDataUri(uri: string): { buffer: Buffer; contentType: string } | null {
  const match = uri.match(DATA_URI_PATTERN);
  const [, contentType, base64] = match ?? [];
  if (contentType === undefined || base64 === undefined) {
    return null;
  }

  try {
    const buffer = Buffer.from(base64, "base64");
    return { buffer, contentType };
  } catch {
    return null;
  }
}
