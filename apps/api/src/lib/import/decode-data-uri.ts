/**
 * Decodes a data URI (e.g. from an embedded vCard photo) into a buffer and media type.
 */
export function decodeDataUri(uri: string): { buffer: Buffer; contentType: string } | null {
  const match = uri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const contentType = match[1];
  const base64 = match[2];

  try {
    const buffer = Buffer.from(base64, "base64");
    return { buffer, contentType };
  } catch {
    return null;
  }
}
