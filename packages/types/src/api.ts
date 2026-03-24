/**
 * API Types
 * Shared types for API requests and responses
 */

import type { Contact } from "./contact";

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

/** Avatar image quality preset for Supabase Storage image transformations */
export type AvatarQuality = "low" | "medium" | "high";

/** Avatar image size preset for Supabase Storage image transformations */
export type AvatarSize = "small" | "medium" | "large";

/** Options for transforming avatar images via Supabase Storage */
export interface AvatarTransformOptions {
  quality?: AvatarQuality;
  size?: AvatarSize;
}

/**
 * A single scraped work history entry from LinkedIn
 */
export interface ScrapedWorkHistoryEntry {
  title?: string;
  companyName: string;
  /** LinkedIn company handle or numeric ID (e.g. "zs-associates" or "960796") */
  companyLinkedinId?: string;
  companyLogoUrl?: string;
  startDate?: string;
  endDate?: string;
  employmentType?: string;
  location?: string;
  description?: string;
}

/**
 * A single scraped education entry from LinkedIn
 */
export interface ScrapedEducationEntry {
  schoolName: string;
  /** LinkedIn school handle or numeric ID (e.g. "university-of-michigan" or "18915") */
  schoolLinkedinId?: string;
  schoolLogoUrl?: string;
  degree?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
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
  headline?: string;
  location?: string;
  notes?: string;
  /** LinkedIn work history to insert when creating a new contact */
  workHistory?: ScrapedWorkHistoryEntry[];
  /** LinkedIn education history to insert when creating a new contact */
  educationHistory?: ScrapedEducationEntry[];
  /** LinkedIn bio / about section text */
  linkedinBio?: string;
}

/**
 * Enrich endpoint request body (from browser extension via webapp).
 * Force-overwrites all provided fields on an existing contact.
 */
export interface EnrichContactRequest {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  profileImageUrl?: string;
  headline?: string;
  location?: string;
  linkedinBio?: string;
  workHistory?: ScrapedWorkHistoryEntry[];
  educationHistory?: ScrapedEducationEntry[];
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

export type InstagramImportSource = "following" | "followers" | "close_friends";

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
  sources: InstagramImportSource[];
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

export interface VCardPreparedContact {
  tempId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  headline: string | null;
  phones: Array<{ prefix: string; value: string; type: "home" | "work"; preferred: boolean }>;
  emails: Array<{ value: string; type: "home" | "work"; preferred: boolean }>;
  addresses: Array<{
    value: string;
    type: "home" | "work" | "other";
    preferred: boolean;
    addressLine1: string | null;
    addressLine2: string | null;
    addressCity: string | null;
    addressPostalCode: string | null;
    addressState: string | null;
    addressStateCode: string | null;
    addressCountry: string | null;
    addressCountryCode: string | null;
    addressFormatted: string | null;
    latitude: number | null;
    longitude: number | null;
    geocodeSource: "mapy.com" | null;
    /** Street validated as existing (valid), city-only or unchecked (unverifiable), or street not found (invalid). */
    validity: "valid" | "unverifiable" | "invalid";
    timezone: string | null;
  }>;
  linkedin: string | null;
  instagram: string | null;
  whatsapp: string | null;
  facebook: string | null;
  signal: string | null;
  website: string | null;
  avatarUri: string | null;
  importantDates: Array<{
    type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
    date: string;
    note: string | null;
  }> | null;
  isValid: boolean;
  issues: string[];
}

export interface VCardParseResponse {
  contacts: VCardPreparedContact[];
  totalCount: number;
  validCount: number;
  invalidCount: number;
}

export interface VCardImportCommitRequest {
  contacts: VCardPreparedContact[];
}

export interface VCardImportCommitResponse {
  importedCount: number;
  skippedCount: number;
}

export type MergeConflictChoice = "left" | "right";

export type MergeConflictField =
  | "firstName"
  | "middleName"
  | "lastName"
  | "headline"
  | "location"
  | "notes"
  | "lastInteraction"
  | "phones"
  | "emails"
  | "importantDates"
  | "language"
  | "timezone"
  | "gisPoint"
  | "latitude"
  | "longitude"
  | "linkedin"
  | "instagram"
  | "whatsapp"
  | "facebook"
  | "website"
  | "signal";

export interface MergeContactsRequest {
  leftPersonId: string;
  rightPersonId: string;
  conflictResolutions?: Partial<Record<MergeConflictField, MergeConflictChoice>>;
}

export interface MergeContactsResponse {
  personId: string;
  userId: string;
  mergedIntoPersonId: string;
  mergedFromPersonId: string;
}

export type ShareableField =
  | "name"
  | "avatar"
  | "headline"
  | "phones"
  | "emails"
  | "location"
  | "linkedin"
  | "instagram"
  | "facebook"
  | "website"
  | "whatsapp"
  | "signal"
  | "addresses"
  | "notes"
  | "importantDates";

export interface ShareContactRequest {
  personId: string;
  recipientEmails: string[];
  message?: string;
  sendCopy: boolean;
  selectedFields: ShareableField[];
}

export type MergeRecommendationReason = "fullName" | "email" | "phone";

export interface MergeRecommendation {
  id: string;
  leftPerson: Contact;
  rightPerson: Contact;
  score: number;
  reasons: MergeRecommendationReason[];
}

export interface MergeRecommendationsResponse {
  recommendations: MergeRecommendation[];
}

export interface DeclineMergeRecommendationResponse {
  success: true;
}

export interface RefreshMergeRecommendationsResponse {
  success: true;
  recommendationsCount: number;
}
