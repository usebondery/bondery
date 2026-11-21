/**
 * Decodes a data URI (e.g. from an embedded vCard photo) into a buffer and media type.
 */
export function decodeDataUri(uri: string): { buffer: Buffer; contentType: string } | null {
  const match = uri.match(/^data:([^;]+);base64,(.+)$/);
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
