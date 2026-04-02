/**
 * Contact Domain Types
 * Types for contact/person management
 */

import type { Json } from "./supabase.types";

/**
 * Contact type for phone/email entries
 */
export type ContactType = "home" | "work";

/**
 * Phone entry with prefix, value, type and preferred flag
 */
export interface PhoneEntry {
  prefix: string;
  value: string;
  type: ContactType;
  preferred: boolean;
}

/**
 * Email entry with type and preferred flag
 */
export interface EmailEntry {
  value: string;
  type: ContactType;
  preferred: boolean;
}

export type ContactAddressType = "home" | "work" | "other";

export interface ContactAddressEntry {
  value: string;
  type: ContactAddressType;
  label: string | null;
  latitude: number | null;
  longitude: number | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  addressState: string | null;
  addressStateCode: string | null;
  addressCountry: string | null;
  addressCountryCode: string | null;
  addressGranularity: "address" | "city" | "state" | "country";
  addressFormatted: string | null;
  addressGeocodeSource: "mapy.com" | "manual" | null;
  geocodeConfidence: "verified" | "unverifiable" | null;
  timezone: string | null;
}

export type ImportantDateType = "birthday" | "anniversary" | "nameday" | "graduation" | "other";

export type ImportantDateNotifyDaysBefore = 1 | 3 | 7 | null;

export interface ImportantDate {
  id: string;
  userId: string;
  personId: string;
  type: ImportantDateType;
  date: string;
  note: string | null;
  notifyOn: string | null;
  notifyDaysBefore: ImportantDateNotifyDaysBefore;
  createdAt: string;
  updatedAt: string;
}

export interface UpcomingReminder {
  importantDate: ImportantDate;
  person: ContactPreview;
  notificationSent: boolean;
  notificationSentAt: string | null;
}

/**
 * Contact entity - represents a person in the user's network
 * Uses camelCase for API/frontend consumption
 */
export interface Contact {
  id: string;
  userId: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  headline: string | null;
  location: string | null;
  notes: string | null;
  notesUpdatedAt?: string | null;
  avatar: string | null;
  lastInteraction: string | null;
  lastInteractionActivityId: string | null;
  keepFrequencyDays: number | null;
  createdAt: string;
  updatedAt?: string | null;
  /** Array of phone entries with type and preferred flag */
  phones: PhoneEntry[] | Json | null;
  /** Array of email entries with type and preferred flag */
  emails: EmailEntry[] | Json | null;
  /** Array of address entries with type and structured metadata */
  addresses?: ContactAddressEntry[] | Json | null;
  linkedin: string | null;
  instagram: string | null;
  whatsapp: string | null;
  facebook: string | null;
  website: string | null;
  signal: string | null;
  importantDates?: ImportantDate[] | null;
  myself: boolean | null;
  position?: Json | null;
  language: string | null;
  timezone: string | null;
  gisPoint: string | null;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Lightweight contact preview for list aggregations
 */
export interface ContactPreview {
  id: string;
  firstName: string;
  lastName: string | null;
  avatar: string | null;
}

/**
 * Supported relationship type values for person-to-person relationships
 */
export type RelationshipType =
  | "parent"
  | "child"
  | "spouse"
  | "partner"
  | "sibling"
  | "friend"
  | "colleague"
  | "neighbor"
  | "guardian"
  | "dependent"
  | "other";

/**
 * Relationship record between two contacts
 */
export interface ContactRelationship {
  id: string;
  userId: string;
  sourcePersonId: string;
  targetPersonId: string;
  relationshipType: RelationshipType;
  createdAt: string;
  updatedAt: string;
}

/**
 * Relationship record with lightweight source/target contact previews
 */
export interface ContactRelationshipWithPeople extends ContactRelationship {
  sourcePerson: ContactPreview;
  targetPerson: ContactPreview;
}

/**
 * Data required to create a new contact
 */
export interface CreateContactInput {
  firstName: string;
  middleName?: string;
  lastName?: string;
  linkedin?: string;
}

/**
 * Data for updating an existing contact (all fields optional)
 */
export type UpdateContactInput = Partial<Omit<Contact, "id" | "createdAt">>;

/**
 * Response from contacts list endpoint
 */
export interface ContactsListResponse {
  contacts: Contact[];
  totalCount: number;
}

/**
 * Response from single contact fetch
 */
export interface ContactResponse {
  contact: Contact;
}

/**
 * Request body for creating a person relationship
 */
export interface CreateContactRelationshipInput {
  relatedPersonId: string;
  relationshipType: RelationshipType;
}

/**
 * Request body for updating an existing person relationship
 */
export interface UpdateContactRelationshipInput {
  relatedPersonId: string;
  relationshipType: RelationshipType;
}

/**
 * Response from person relationships endpoint
 */
export interface ContactRelationshipsResponse {
  relationships: ContactRelationshipWithPeople[];
}

/**
 * Filter parameters for selecting contacts without enumerating IDs.
 * Mirrors the query string accepted by GET /api/contacts.
 */
export interface ContactsFilter {
  q?: string;
  sort?:
    | "nameAsc"
    | "nameDesc"
    | "surnameAsc"
    | "surnameDesc"
    | "interactionAsc"
    | "interactionDesc"
    | "createdAtAsc"
    | "createdAtDesc";
}

/**
 * Request body for deleting multiple contacts.
 * Supports either an explicit list of IDs or a filter that matches all contacts to delete.
 */
export type DeleteContactsRequest =
  | { ids: string[] }
  | { filter: ContactsFilter; excludeIds?: string[] };

/**
 * A single work history entry for a contact, typically sourced from LinkedIn.
 */
export interface WorkHistoryEntry {
  id: string;
  userId: string;
  peopleLinkedinId: string;
  companyName: string;
  companyLinkedinUrl: string | null;
  companyLogoUrl: string | null;
  title: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  employmentType: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * A single education entry for a contact, typically sourced from LinkedIn.
 */
export interface EducationEntry {
  id: string;
  userId: string;
  peopleLinkedinId: string;
  schoolName: string;
  schoolLinkedinUrl: string | null;
  schoolLogoUrl: string | null;
  degree: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response from GET /contacts/:id/linkedin-data
 */
export interface LinkedInDataResponse {
  linkedinBio: string | null;
  syncedAt: string | null;
  workHistory: WorkHistoryEntry[];
  education: EducationEntry[];
}

/**
 * Enrich queue item status values.
 */
export type EnrichQueueStatus = "pending" | "processing" | "completed" | "failed";

/**
 * A single entry in the LinkedIn enrich queue.
 */
export interface EnrichQueueItem {
  id: string;
  userId: string;
  personId: string;
  status: EnrichQueueStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  /** Included when returning queue items with contact details */
  linkedinHandle?: string;
}

/**
 * Response from GET /contacts/enrich-queue/eligible-count
 */
export interface EnrichEligibleCountResponse {
  count: number;
}
