import sharp from "sharp";

const DEFAULT_JPEG_QUALITY = 85;

export const AVATAR_IMAGE_MAX_EDGE = 512;
export const LINKEDIN_LOGO_MAX_EDGE = 256;

export type NormalizeImageOptions = {
  maxEdge?: number;
  quality?: number;
};

/** Normalize uploads to a consistent JPEG (auto-orient, resize, strip metadata). */
export async function normalizeImageToJpeg(
  input: Buffer,
  options: NormalizeImageOptions = {},
): Promise<Buffer> {
  const maxEdge = options.maxEdge ?? AVATAR_IMAGE_MAX_EDGE;
  const quality = options.quality ?? DEFAULT_JPEG_QUALITY;

  return sharp(input)
    .rotate()
    .resize(maxEdge, maxEdge, { fit: "inside", withoutEnlargement: true })
    .jpeg({ mozjpeg: true, quality })
    .toBuffer();
}
