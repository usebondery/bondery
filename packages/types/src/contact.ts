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
  addressGeocodeSource: string | null;
}

/**
 * Important date associated with a contact
 */
export interface ImportantDate {
  id: string;
  name: string;
  date: string;
  notify: boolean;
}

export type ImportantEventType = "birthday" | "anniversary" | "nameday" | "graduation" | "other";

export type ImportantEventNotifyDaysBefore = 1 | 3 | 7 | null;

export interface ImportantEvent {
  id: string;
  userId: string;
  personId: string;
  eventType: ImportantEventType;
  eventDate: string;
  note: string | null;
  notifyOn: string | null;
  notifyDaysBefore: ImportantEventNotifyDaysBefore;
  createdAt: string;
  updatedAt: string;
}

export interface UpcomingReminder {
  event: ImportantEvent;
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
  title: string | null;
  place: string | null;
  notes: string | null;
  avatar: string | null;
  lastInteraction: string | null;
  createdAt: string;
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
  importantEvents?: ImportantEvent[] | null;
  myself: boolean | null;
  position?: Json | null;
  language: string | null;
  timezone: string | null;
  location: string | null;
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
  addressGeocodeSource: string | null;
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
  lastName: string;
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
 * Request body for deleting multiple contacts
 */
export interface DeleteContactsRequest {
  ids: string[];
}
