import type { PaginationMeta } from "../_shared/types.js";
import type { Contact } from "../contact/types.js";

export type MergeConflictChoice = "left" | "right";

export type MergeConflictField =
  | "firstName"
  | "middleName"
  | "lastName"
  | "avatar"
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

export type MergeRecommendationReason = "fullName" | "email" | "phone";

export interface MergeRecommendation {
  id: string;
  leftPerson: Contact;
  reasons: MergeRecommendationReason[];
  rightPerson: Contact;
  score: number;
}

export interface MergeContactsRequest {
  conflictResolutions?: Partial<Record<MergeConflictField, MergeConflictChoice>>;
  leftPersonId: string;
  rightPersonId: string;
}

export interface MergeContactsResponse {
  contact: Contact | null;
  mergedFromPersonId: string;
  mergedIntoPersonId: string;
  personId: string;
  userId: string;
}

export interface MergeRecommendationsResponse {
  pagination: PaginationMeta;
  recommendations: MergeRecommendation[];
}

export interface DeclineMergeRecommendationResponse {
  success: boolean;
}

export interface MergeRecommendationsCountResponse {
  activeCount: number;
}

export interface RefreshMergeRecommendationsResponse {
  recommendations: MergeRecommendation[];
  recommendationsCount: number;
  success: boolean;
}
