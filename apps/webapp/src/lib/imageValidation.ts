import { AVATAR_UPLOAD } from "./config";

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateImageType(mimeType: string): ImageValidationResult {
  const isValid = (AVATAR_UPLOAD.allowedMimeTypes as readonly string[]).includes(mimeType);

  if (!isValid) {
    return {
      isValid: false,
      error: `Invalid file type. Only images are allowed (${AVATAR_UPLOAD.allowedMimeTypes.join(", ")}).`,
    };
  }

  return { isValid: true };
}

export function validateImageSize(fileSize: number): ImageValidationResult {
  if (fileSize > AVATAR_UPLOAD.maxFileSize) {
    return {
      isValid: false,
      error: `File too large. Maximum size is ${AVATAR_UPLOAD.maxFileSizeMB}MB.`,
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
