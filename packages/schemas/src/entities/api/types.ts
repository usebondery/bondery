import type { ShareableField } from "../contact/types.js";

export interface ApiSuccessResponse {
  message?: string;
  success: boolean;
}

export interface PhotoUploadResponse {
  avatarUrl?: string | null;
  error?: string;
  success: boolean;
}

export interface ImageValidationResult {
  error?: string;
  isValid: boolean;
}

export type AvatarQuality = "low" | "medium" | "high";
export type AvatarSize = "small" | "medium" | "large";

export interface AvatarTransformOptions {
  quality?: AvatarQuality;
  size?: AvatarSize;
}

export interface ShareContactRequest {
  message?: string;
  personId: string;
  recipientEmails: string[];
  selectedFields: ShareableField[];
  sendCopy: boolean;
}

export interface FeedbackFormInput {
  generalFeedback: string;
  npsReason: string;
  npsScore: number;
}

export interface InputMaxLengths {
  dateName: number;
  description: number;
  firstName: number;
  headline: number;
  lastName: number;
  location: number;
  middleName: number;
}

export interface AvatarUploadConfig {
  allowedMimeTypes: string[];
  maxFileSize: number;
  maxFileSizeMB: number;
}

export interface IntegrationProvider {
  active: boolean;
  backgroundColor: string;
  displayName: string;
  icon: string;
  iconColor: string;
  provider: string;
  providerKey: string;
}
