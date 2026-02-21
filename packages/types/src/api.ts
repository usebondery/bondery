/**
 * API Types
 * Shared types for API requests and responses
 */

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: string;
  description?: string;
}

/**
 * Standard API success response
 */
export interface ApiSuccessResponse {
  success: true;
  message?: string;
}

/**
 * Photo upload response
 */
export interface PhotoUploadResponse {
  success: boolean;
  avatarUrl?: string;
  error?: string;
}

/**
 * Image validation result
 */
export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Redirect endpoint request body (from browser extension)
 */
export interface RedirectRequest {
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  profileImageUrl?: string;
  title?: string;
  place?: string;
}

/**
 * Redirect endpoint response.
 * When `existed` is true, preview fields (firstName, lastName, avatar) are included
 * so the extension can display a person preview without an extra API call.
 */
export interface RedirectResponse {
  contactId: string;
  existed: boolean;
  /** Included when `existed` is true */
  firstName?: string;
  /** Included when `existed` is true */
  lastName?: string | null;
  /** Included when `existed` is true */
  avatar?: string | null;
}

export interface LinkedInPreparedContact {
  tempId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  linkedinUrl: string;
  linkedinUsername: string;
  alreadyExists: boolean;
  email: string | null;
  company: string | null;
  position: string | null;
  connectedAt: string | null;
  connectedOnRaw: string | null;
  isValid: boolean;
  issues: string[];
}

export interface LinkedInParseResponse {
  contacts: LinkedInPreparedContact[];
  totalCount: number;
  validCount: number;
  invalidCount: number;
}

export interface LinkedInImportCommitRequest {
  contacts: LinkedInPreparedContact[];
}

export interface LinkedInImportCommitResponse {
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
}

export type InstagramImportStrategy =
  | "close_friends"
  | "following"
  | "followers"
  | "following_and_followers"
  | "mutual_following";

export interface InstagramPreparedContact {
  tempId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  instagramUrl: string;
  instagramUsername: string;
  alreadyExists: boolean;
  likelyPerson: boolean;
  connectedAt: string | null;
  connectedOnRaw: number | null;
  isValid: boolean;
  issues: string[];
}

export interface InstagramParseResponse {
  contacts: InstagramPreparedContact[];
  totalCount: number;
  validCount: number;
  invalidCount: number;
}

export interface InstagramImportCommitRequest {
  contacts: InstagramPreparedContact[];
}

export interface InstagramImportCommitResponse {
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
}
