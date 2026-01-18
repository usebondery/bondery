/**
 * Shared configuration for the API server
 */

export const AVATAR_UPLOAD = {
  allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"] as const,
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
  webapp: process.env.WEBAPP_URL || "https://app.usebondery.com",
  website: process.env.WEBSITE_URL || "https://usebondery.com",
  login: "/login",
} as const;
