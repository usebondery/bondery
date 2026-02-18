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
 * Validates image upload
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
 * URLs for redirects
 */
export const URLS = {
  webapp: process.env.NEXT_PUBLIC_WEBAPP_URL,
  website: process.env.NEXT_PUBLIC_WEBSITE_URL,
  login: "/login",
} as const;
