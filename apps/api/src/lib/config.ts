/**
 * Shared configuration for the API server
 */

export const AVATAR_UPLOAD = {
  allowedMimeTypes: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
    "image/heic",
    "image/heif",
  ] as const,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFileSizeMB: 5,
} as const;

/**
 * Validates image upload MIME type and size from request headers.
 */
export function validateImageUpload(file: { type: string; size: number }): {
  isValid: boolean;
  error?: string;
} {
  const isValidType = (AVATAR_UPLOAD.allowedMimeTypes as readonly string[]).includes(file.type);

  if (!isValidType) {
    return {
      isValid: false,
      error: `Invalid file type. Only images are allowed (${AVATAR_UPLOAD.allowedMimeTypes.join(", ")}).`,
    };
  }

  if (file.size > AVATAR_UPLOAD.maxFileSize) {
    return {
      isValid: false,
      error: `File too large. Maximum size is ${AVATAR_UPLOAD.maxFileSizeMB}MB.`,
    };
  }

  return { isValid: true };
}

/**
 * Magic-byte signatures for allowed image formats.
 * Validates that file content matches an allowed image type
 * (prevents MIME-type spoofing via Content-Type header).
 */
const IMAGE_SIGNATURES: Array<{ bytes: number[]; offset?: number; mask?: number[] }> = [
  // JPEG: FF D8 FF
  { bytes: [0xff, 0xd8, 0xff] },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  // GIF87a / GIF89a
  { bytes: [0x47, 0x49, 0x46, 0x38] },
  // WebP: RIFF....WEBP (bytes 8-11)
  { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  // HEIF/HEIC/AVIF: ftyp box at offset 4
  { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
];

/**
 * Validates that a buffer's leading bytes match a known image format signature.
 *
 * @param buffer - The raw file content to check.
 * @returns True if the buffer starts with a recognised image magic-byte sequence.
 */
export function validateImageMagicBytes(buffer: Buffer | Uint8Array): boolean {
  if (buffer.length < 12) return false;

  return IMAGE_SIGNATURES.some(({ bytes, offset = 0 }) =>
    bytes.every((b, i) => buffer[offset + i] === b),
  );
}

/**
 * URLs for redirects
 */
export const URLS = {
  webapp: process.env.NEXT_PUBLIC_WEBAPP_URL,
  website: process.env.NEXT_PUBLIC_WEBSITE_URL,
  login: "/login",
} as const;
