import type { ChannelType } from "#primitives/channel/types.js";
import type { Contact } from "../contact/types.js";
import type { ImportantDateType } from "../important-date/types.js";

export interface ScrapedWorkHistoryEntry {
  companyLinkedinId?: string;
  companyLogoUrl?: string;
  companyName: string;
  description?: string;
  employmentType?: string;
  endDate?: string;
  location?: string;
  startDate?: string;
  title?: string;
}

export interface ScrapedEducationEntry {
  degree?: string;
  description?: string;
  endDate?: string;
  schoolLinkedinId?: string;
  schoolLogoUrl?: string;
  schoolName: string;
  startDate?: string;
}

export interface RedirectRequest {
  educationHistory?: ScrapedEducationEntry[];
  facebook?: string;
  firstName?: string;
  headline?: string;
  instagram?: string;
  lastName?: string;
  linkedin?: string;
  linkedinBio?: string;
  location?: string;
  middleName?: string;
  notes?: string;
  profileImageUrl?: string;
  workHistory?: ScrapedWorkHistoryEntry[];
}

export interface EnrichContactRequest {
  educationHistory?: ScrapedEducationEntry[];
  firstName?: string;
  headline?: string | null;
  lastName?: string | null;
  linkedinBio?: string | null;
  location?: string | null;
  middleName?: string | null;
  profileImageUrl?: string | null;
  workHistory?: ScrapedWorkHistoryEntry[];
}

export interface LinkedInDataRequest {
  workHistory?: ScrapedWorkHistoryEntry[];
}

export interface RedirectResponse {
  contact: Contact;
  existed: boolean;
}

export interface LinkedInPreparedContact {
  alreadyExists: boolean;
  company: string | null;
  connectedAt: string | null;
  connectedOnRaw: string | null;
  email: string | null;
  firstName: string;
  issues: string[];
  isValid: boolean;
  lastName: string;
  linkedinUrl: string;
  linkedinUsername: string;
  middleName: string | null;
  position: string | null;
  tempId: string;
}

export interface LinkedInParseResponse {
  contacts: LinkedInPreparedContact[];
  invalidCount: number;
  totalCount: number;
  validCount: number;
}

export interface LinkedInImportCommitRequest {
  contacts: LinkedInPreparedContact[];
}

export interface LinkedInImportCommitResponse {
  importedCount: number;
  skippedCount: number;
  updatedCount: number;
}

export type InstagramImportStrategy =
  | "close_friends"
  | "following"
  | "followers"
  | "following_and_followers"
  | "mutual_following";

export type InstagramImportSource = "following" | "followers" | "close_friends";

export interface InstagramPreparedContact {
  alreadyExists: boolean;
  connectedAt: string | null;
  connectedOnRaw: number | null;
  firstName: string;
  instagramUrl: string;
  instagramUsername: string;
  issues: string[];
  isValid: boolean;
  lastName: string;
  likelyPerson: boolean;
  middleName: string | null;
  sources: InstagramImportSource[];
  tempId: string;
}

export interface InstagramParseResponse {
  contacts: InstagramPreparedContact[];
  invalidCount: number;
  totalCount: number;
  validCount: number;
}

export interface InstagramImportCommitRequest {
  contacts: InstagramPreparedContact[];
}

export interface InstagramImportCommitResponse {
  importedCount: number;
  skippedCount: number;
  updatedCount: number;
}

export interface VCardPreparedContact {
  addresses: VCardPreparedAddress[];
  avatarUri: string | null;
  emails: VCardPreparedEmail[];
  facebook: string | null;
  firstName: string;
  headline: string | null;
  importantDates: VCardPreparedImportantDate[] | null;
  instagram: string | null;
  issues: string[];
  isValid: boolean;
  lastName: string;
  linkedin: string | null;
  middleName: string | null;
  phones: VCardPreparedPhone[];
  signal: string | null;
  tempId: string;
  website: string | null;
  whatsapp: string | null;
}

export interface VCardPreparedPhone {
  preferred: boolean;
  prefix: string;
  type: ChannelType;
  value: string;
}

export interface VCardPreparedEmail {
  preferred: boolean;
  type: ChannelType;
  value: string;
}

export interface VCardPreparedAddress {
  addressCity: string | null;
  addressCountry: string | null;
  addressCountryCode: string | null;
  addressFormatted: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressPostalCode: string | null;
  addressState: string | null;
  addressStateCode: string | null;
  geocodeSource: "mapy.com" | null;
  latitude: number | null;
  longitude: number | null;
  preferred: boolean;
  timezone: string | null;
  type: "home" | "work" | "other";
  validity: "valid" | "unverifiable" | "invalid";
  value: string;
}

export interface VCardPreparedImportantDate {
  date: string;
  note: string | null;
  type: ImportantDateType;
}

export interface VCardParseResponse {
  contacts: VCardPreparedContact[];
  invalidCount: number;
  totalCount: number;
  validCount: number;
}

export interface VCardImportCommitRequest {
  contacts: VCardPreparedContact[];
}

export interface VCardImportCommitResponse {
  importedCount: number;
  skippedCount: number;
}
