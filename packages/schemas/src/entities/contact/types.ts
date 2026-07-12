import type { PaginationMeta } from "../_shared/types.js";
import type { ContactAddressRead, ContactAddressType } from "../address/types.js";
import type { EmailEntry, PhoneEntry } from "../channels/types.js";
import type { ImportantDate, ImportantDateInputValidated } from "../important-date/types.js";

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

export interface Contact {
  addresses?: ContactAddressRead[] | null;
  avatar: string | null;
  createdAt: string;
  emails: EmailEntry[] | null;
  facebook: string | null;
  firstName: string;
  gisPoint: unknown | null;
  headline: string | null;
  id: string;
  importantDates?: ImportantDate[] | null;
  instagram: string | null;
  keepFrequencyDays: number | null;
  language: string | null;
  lastInteraction: string | null;
  lastInteractionActivityId: string | null;
  lastName: string | null;
  latitude: number | null;
  linkedin: string | null;
  location: string | null;
  longitude: number | null;
  middleName: string | null;
  myself: boolean | null;
  notes: string | null;
  notesUpdatedAt?: string | null;
  phones: PhoneEntry[] | null;
  position?: unknown | null;
  signal: string | null;
  timezone: string | null;
  updatedAt: string;
  userId: string;
  website: string | null;
  whatsapp: string | null;
}

export interface ContactPreview {
  avatar: string | null;
  firstName: string;
  id: string;
  lastName: string | null;
}

/** Lean contact shape for pickers, comboboxes, and activity participant selection. */
export interface ContactSelectable extends ContactPreview {
  headline: string | null;
  location: string | null;
  middleName: string | null;
  myself: boolean | null;
}

/**
 * Paginated people list row — `CONTACT_SELECT` fields plus channel/social enrichment.
 * Detail routes use full `Contact` (important dates, position, etc.).
 */
export interface ContactListItem {
  addresses?: ContactAddressRead[];
  avatar: string | null;
  createdAt: string;
  emails: EmailEntry[] | null;
  facebook: string | null;
  firstName: string;
  gisPoint: unknown | null;
  headline: string | null;
  id: string;
  instagram: string | null;
  keepFrequencyDays: number | null;
  language: string | null;
  lastInteraction: string | null;
  lastInteractionActivityId: string | null;
  lastName: string | null;
  latitude: number | null;
  linkedin: string | null;
  location: string | null;
  longitude: number | null;
  middleName: string | null;
  myself: boolean | null;
  notes: string | null;
  notesUpdatedAt?: string | null;
  phones: PhoneEntry[] | null;
  signal: string | null;
  timezone: string | null;
  updatedAt: string;
  userId: string;
  website: string | null;
  whatsapp: string | null;
}

export interface ContactRelationship {
  createdAt: string;
  id: string;
  relationshipType: RelationshipType;
  sourcePersonId: string;
  targetPersonId: string;
  updatedAt: string;
  userId: string;
}

export interface ContactRelationshipWithPeople extends ContactRelationship {
  sourcePerson: ContactPreview;
  targetPerson: ContactPreview;
}

export interface CreateContactInput {
  firstName: string;
  lastName?: string;
  linkedin?: string;
  middleName?: string;
}

/** POST /api/contacts body (optional client-supplied id). */
export interface CreateContactBody extends CreateContactInput {
  id?: string | undefined;
}

/** POST /api/contacts — minimal create from mobile FAB sheet. */
export interface CreateContactFromFullNameInput {
  fullName: string;
}

export interface UpdateContactIdentityFormInput {
  firstName: string;
  headline: string;
  lastName: string;
  middleName: string;
}

export interface UpdateContactIdentityInput {
  firstName: string;
  headline: string | null;
  lastName: string | null;
  middleName: string | null;
}

export interface UpdateContactInput {
  addresses?: ContactAddressRead[] | null | undefined;
  avatar?: string | null | undefined;
  emails?: EmailEntry[] | null | undefined;
  facebook?: string | null | undefined;
  firstName?: string | undefined;
  gisPoint?: unknown | null | undefined;
  headline?: string | null | undefined;
  importantDates?: ImportantDateInputValidated[] | null | undefined;
  instagram?: string | null | undefined;
  keepFrequencyDays?: number | null | undefined;
  language?: string | null | undefined;
  lastInteraction?: string | null | undefined;
  lastInteractionActivityId?: string | null | undefined;
  lastName?: string | null | undefined;
  latitude?: number | null | undefined;
  linkedin?: string | null | undefined;
  location?: string | null | undefined;
  longitude?: number | null | undefined;
  middleName?: string | null | undefined;
  myself?: boolean | null | undefined;
  notes?: string | null | undefined;
  notesUpdatedAt?: string | null | undefined;
  phones?: PhoneEntry[] | null | undefined;
  position?: unknown | null | undefined;
  signal?: string | null | undefined;
  timezone?: string | null | undefined;
  userId?: string | undefined;
  website?: string | null | undefined;
  whatsapp?: string | null | undefined;
}

export interface ContactResponse {
  contact: Contact;
}

export interface CreateContactResponse extends ContactResponse {
  txid?: string;
}

export interface MapPin {
  avatar: string | null;
  firstName: string;
  headline: string | null;
  id: string;
  lastInteraction: string | null;
  lastName: string | null;
  latitude: number;
  location: string | null;
  longitude: number;
}

export interface MapPinsResponse {
  pins: MapPin[];
}

export interface AddressPin {
  addressCity: string | null;
  addressCountry: string | null;
  addressFormatted: string | null;
  addressId: string;
  addressType: ContactAddressType;
  avatar: string | null;
  firstName: string;
  lastName: string | null;
  latitude: number;
  longitude: number;
  personId: string;
}

export interface MapAddressPinsResponse {
  pins: AddressPin[];
}

export interface ContactsListStats {
  newContactsThisYear: number;
  thisMonthInteractions: number;
  totalContacts: number;
}

export interface ContactsListResponse {
  contacts: ContactListItem[];
  pagination: PaginationMeta;
  stats: ContactsListStats;
}

export interface ContactsSelectableListResponse {
  contacts: ContactSelectable[];
  pagination: PaginationMeta;
}

export interface CreateContactRelationshipInput {
  relatedPersonId: string;
  relationshipType: RelationshipType;
}

export type UpdateContactRelationshipInput = CreateContactRelationshipInput;

export interface ContactRelationshipsResponse {
  relationships: ContactRelationshipWithPeople[];
}

export type ContactSortOrder =
  | "nameAsc"
  | "nameDesc"
  | "surnameAsc"
  | "surnameDesc"
  | "interactionAsc"
  | "interactionDesc"
  | "createdAtAsc"
  | "createdAtDesc";

export interface ContactsFilter {
  search?: string;
  sort?: ContactSortOrder;
}

export type DeleteContactsRequest =
  | { ids: string[] }
  | {
      excludeIds?: string[];
      filter: ContactsFilter;
    };

export interface DeleteContactsResponse {
  deletedCount?: number;
  message: string;
}

export interface BySocialLookupResponse {
  contact?: ContactPreview;
  exists: boolean;
}

export interface DeleteContactResponse {
  message: string;
}

export interface WorkHistoryEntry {
  companyLinkedinUrl: string | null;
  companyLogoUrl: string | null;
  companyName: string;
  createdAt: string;
  description: string | null;
  employmentType: string | null;
  endDate: string | null;
  id: string;
  location: string | null;
  peopleLinkedinId: string;
  startDate: string | null;
  title: string | null;
  updatedAt: string;
  userId: string;
}

export interface EducationEntry {
  createdAt: string;
  degree: string | null;
  description: string | null;
  endDate: string | null;
  id: string;
  peopleLinkedinId: string;
  schoolLinkedinUrl: string | null;
  schoolLogoUrl: string | null;
  schoolName: string;
  startDate: string | null;
  updatedAt: string;
  userId: string;
}

export interface LinkedInDataResponse {
  education: EducationEntry[];
  linkedinBio: string | null;
  syncedAt: string | null;
  workHistory: WorkHistoryEntry[];
}

export type EnrichQueueStatus = "pending" | "processing" | "completed" | "failed";

export interface EnrichQueueItem {
  createdAt: string;
  errorMessage: string | null;
  id: string;
  linkedinHandle?: string;
  personId: string;
  status: EnrichQueueStatus;
  updatedAt: string;
  userId: string;
}

/** @deprecated Use EnrichQueueCountResponse */
export interface EnrichEligibleCountResponse {
  count: number;
}

export interface EnrichQueueCountResponse {
  eligibleCount: number;
}

export interface KeepInTouchCountResponse {
  overdueCount: number;
}

export interface EnrichQueueStatusCounts {
  completed: number;
  failed: number;
  pending: number;
}

export interface EnrichQueueInitResponse {
  totalEligible: number;
}

export interface EnrichQueueNextBatchItem {
  firstName: string | null;
  lastName: string | null;
  linkedinHandle: string | null;
  personId: string;
  queueItemId: string;
}

export interface EnrichQueueNextBatchResponse {
  items: EnrichQueueNextBatchItem[];
}

export interface LinkedInDataUpsertResponse {
  count: number;
  success: boolean;
}

export interface ContactRelationshipResponse {
  relationship: ContactRelationship;
}

/** POST /api/contacts/enrich-queue/init optional body. */
export type EnrichQueueInitBody = { personId?: string } | undefined;

/** PATCH /api/contacts/enrich-queue/:id body. */
export interface EnrichQueuePatchBody {
  errorMessage?: string | null;
  status: "completed" | "failed";
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
