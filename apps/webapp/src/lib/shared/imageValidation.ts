import { AVATAR_UPLOAD } from "@/lib/platform/config";

export interface ImageValidationResult {
  error?: string;
  isValid: boolean;
}

export function validateImageType(mimeType: string): ImageValidationResult {
  const isValid = (AVATAR_UPLOAD.allowedMimeTypes as readonly string[]).includes(mimeType);

  if (!isValid) {
    return {
      error: `Invalid file type. Only images are allowed (${AVATAR_UPLOAD.allowedMimeTypes.join(", ")}).`,
      isValid: false,
    };
  }

  return { isValid: true };
}

export function validateImageSize(fileSize: number): ImageValidationResult {
  if (fileSize > AVATAR_UPLOAD.maxFileSize) {
    return {
      error: `File too large. Maximum size is ${AVATAR_UPLOAD.maxFileSizeMB}MB.`,
      isValid: false,
    };
  }

  return { isValid: true };
}

export function validateImageUpload(file: { type: string; size: number }): ImageValidationResult {
  const typeValidation = validateImageType(file.type);
  if (!typeValidation.isValid) {
    return typeValidation;
  }

  const sizeValidation = validateImageSize(file.size);
  if (!sizeValidation.isValid) {
    return sizeValidation;
  }

  return { isValid: true };
}
