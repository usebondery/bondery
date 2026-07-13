// biome-ignore-all lint/style/noExcessiveLinesPerFile: contact schemas are generated as a single Zod module
import { z } from "zod";
import { CONTACT_FIELD_MAX_LENGTHS } from "#constants/index.js";
import { contactIdSchema } from "#contact-id/schema.js";
import {
  entityAuditSchema,
  entityIdentitySchema,
  idsRequestSchema,
  makeCollectionResponseSchema,
  makePaginatedListResponseSchema,
  messageResponseSchema,
  nullableDateTimeSchema,
} from "../_shared/schema.js";
import { contactAddressReadSchema } from "../address/schema.js";
import { emailEntryEntitySchema, phoneEntryEntitySchema } from "../channels/schema.js";
import { importantDateSchema, replaceImportantDatesSchema } from "../important-date/schema.js";
import type {
  AddressPin,
  BySocialLookupResponse,
  Contact,
  ContactListItem,
  ContactPreview,
  ContactRelationship,
  ContactRelationshipResponse,
  ContactRelationshipsResponse,
  ContactRelationshipWithPeople,
  ContactResponse,
  ContactSelectable,
  ContactSortOrder,
  ContactsFilter,
  ContactsListResponse,
  ContactsListStats,
  ContactsSelectableListResponse,
  CreateContactBody,
  CreateContactFromFullNameInput,
  CreateContactInput,
  CreateContactRelationshipInput,
  CreateContactResponse,
  DeleteContactResponse,
  DeleteContactsRequest,
  DeleteContactsResponse,
  EducationEntry,
  EnrichEligibleCountResponse,
  EnrichQueueCountResponse,
  EnrichQueueInitBody,
  EnrichQueueInitResponse,
  EnrichQueueItem,
  EnrichQueueNextBatchItem,
  EnrichQueueNextBatchResponse,
  EnrichQueuePatchBody,
  EnrichQueueStatus,
  EnrichQueueStatusCounts,
  KeepInTouchCountResponse,
  LinkedInDataResponse,
  LinkedInDataUpsertResponse,
  MapAddressPinsResponse,
  MapPin,
  MapPinsResponse,
  RelationshipType,
  ShareableField,
  UpdateContactIdentityInput,
  UpdateContactInput,
  WorkHistoryEntry,
} from "./types.js";

const trimmedNameField = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { error: `${label} must be at most ${max} characters` });

export const relationshipTypeSchema = z.enum([
  "parent",
  "child",
  "spouse",
  "partner",
  "sibling",
  "friend",
  "colleague",
  "neighbor",
  "guardian",
  "dependent",
  "other",
]) satisfies z.ZodType<RelationshipType>;

export const contactSchema = entityIdentitySchema
  .extend({
    addresses: z.array(contactAddressReadSchema).nullable().optional(),
    avatar: z.string().nullable(),
    emails: z.array(emailEntryEntitySchema).nullable(),
    facebook: z.string().nullable(),
    firstName: z.string(),
    gisPoint: z.unknown().nullable(),
    headline: z.string().nullable(),
    importantDates: z.array(importantDateSchema).nullable().optional(),
    instagram: z.string().nullable(),
    keepFrequencyDays: z.number().nullable(),
    language: z.string().nullable(),
    lastInteraction: nullableDateTimeSchema,
    lastInteractionActivityId: z.string().nullable(),
    lastName: z.string().nullable(),
    latitude: z.number().nullable(),
    linkedin: z.string().nullable(),
    location: z.string().nullable(),
    longitude: z.number().nullable(),
    middleName: z.string().nullable(),
    myself: z.boolean().nullable(),
    notes: z.string().nullable(),
    notesUpdatedAt: nullableDateTimeSchema.optional(),
    phones: z.array(phoneEntryEntitySchema).nullable(),
    position: z.unknown().nullable().optional(),
    signal: z.string().nullable(),
    timezone: z.string().nullable(),
    website: z.string().nullable(),
    whatsapp: z.string().nullable(),
  })
  .extend(entityAuditSchema.shape) satisfies z.ZodType<Contact>;

export const contactPreviewSchema = contactSchema.pick({
  avatar: true,
  firstName: true,
  id: true,
  lastName: true,
}) satisfies z.ZodType<ContactPreview>;

/** Lean contact shape for pickers, comboboxes, and activity participant selection. */
export const contactSelectableSchema = contactPreviewSchema.extend({
  headline: z.string().nullable(),
  location: z.string().nullable(),
  middleName: z.string().nullable(),
  myself: z.boolean().nullable(),
}) satisfies z.ZodType<ContactSelectable>;

/**
 * Paginated people list row — `CONTACT_SELECT` fields plus channel/social enrichment.
 * Detail routes use full `contactSchema` (important dates, position, etc.).
 */
export const contactListItemSchema = contactSchema
  .pick({
    avatar: true,
    createdAt: true,
    emails: true,
    facebook: true,
    firstName: true,
    gisPoint: true,
    headline: true,
    id: true,
    instagram: true,
    keepFrequencyDays: true,
    language: true,
    lastInteraction: true,
    lastInteractionActivityId: true,
    lastName: true,
    latitude: true,
    linkedin: true,
    location: true,
    longitude: true,
    middleName: true,
    myself: true,
    notes: true,
    notesUpdatedAt: true,
    phones: true,
    signal: true,
    timezone: true,
    updatedAt: true,
    userId: true,
    website: true,
    whatsapp: true,
  })
  .extend({
    addresses: z.array(contactAddressReadSchema).optional(),
  }) satisfies z.ZodType<ContactListItem>;

export const contactRelationshipSchema = entityIdentitySchema
  .extend({
    relationshipType: relationshipTypeSchema,
    sourcePersonId: z.string(),
    targetPersonId: z.string(),
  })
  .extend(entityAuditSchema.shape) satisfies z.ZodType<ContactRelationship>;

export const contactRelationshipWithPeopleSchema = contactRelationshipSchema.extend({
  sourcePerson: contactPreviewSchema,
  targetPerson: contactPreviewSchema,
}) satisfies z.ZodType<ContactRelationshipWithPeople>;

export const createContactApiInputSchema = z.object({
  firstName: z.string().trim().min(1, { error: "First name is required" }),
  lastName: z.string().optional(),
  linkedin: z.string().optional(),
  middleName: z.string().optional(),
}) satisfies z.ZodType<CreateContactInput>;

/** POST /api/contacts body (optional client-supplied id). */
export const createContactBodySchema = createContactApiInputSchema.extend({
  id: contactIdSchema.optional(),
}) satisfies z.ZodType<CreateContactBody>;

/** PATCH /api/contacts/:id — identity fields edited from mobile identity sheet. */
export const updateContactIdentitySchema = z
  .object({
    firstName: trimmedNameField(CONTACT_FIELD_MAX_LENGTHS.firstName, "First name").min(1, {
      error: "First name is required",
    }),
    headline: z
      .string()
      .trim()
      .max(CONTACT_FIELD_MAX_LENGTHS.headline, {
        error: `Headline must be at most ${CONTACT_FIELD_MAX_LENGTHS.headline} characters`,
      }),
    lastName: z
      .string()
      .trim()
      .max(CONTACT_FIELD_MAX_LENGTHS.lastName, {
        error: `Last name must be at most ${CONTACT_FIELD_MAX_LENGTHS.lastName} characters`,
      }),
    middleName: z
      .string()
      .trim()
      .max(CONTACT_FIELD_MAX_LENGTHS.middleName, {
        error: `Middle name must be at most ${CONTACT_FIELD_MAX_LENGTHS.middleName} characters`,
      }),
  })
  .transform(({ firstName, middleName, lastName, headline }) => ({
    firstName,
    headline: headline || null,
    lastName: lastName || null,
    middleName: middleName || null,
  })) satisfies z.ZodType<UpdateContactIdentityInput>;

/** POST /api/contacts — minimal create from mobile FAB sheet. */
export const createContactInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, { error: "Name is required" })
    .max(CONTACT_FIELD_MAX_LENGTHS.fullName, {
      error: `Name must be at most ${CONTACT_FIELD_MAX_LENGTHS.fullName} characters`,
    }),
}) satisfies z.ZodType<CreateContactFromFullNameInput>;

export const updateContactInputSchema: z.ZodType<UpdateContactInput> = z.object({
  addresses: z.array(contactAddressReadSchema).nullable().optional(),
  avatar: z.string().nullable().optional(),
  emails: z.array(emailEntryEntitySchema).nullable().optional(),
  facebook: z.string().nullable().optional(),
  firstName: z.string().optional(),
  gisPoint: z.unknown().nullable().optional(),
  headline: z.string().nullable().optional(),
  importantDates: replaceImportantDatesSchema.nullable().optional(),
  instagram: z.string().nullable().optional(),
  keepFrequencyDays: z.number().nullable().optional(),
  language: z.string().nullable().optional(),
  lastInteraction: nullableDateTimeSchema.optional(),
  lastInteractionActivityId: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  linkedin: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  longitude: z.number().nullable().optional(),
  middleName: z.string().nullable().optional(),
  myself: z.boolean().nullable().optional(),
  notes: z.string().nullable().optional(),
  notesUpdatedAt: nullableDateTimeSchema.optional(),
  phones: z.array(phoneEntryEntitySchema).nullable().optional(),
  position: z.unknown().nullable().optional(),
  signal: z.string().nullable().optional(),
  timezone: z.string().nullable().optional(),
  userId: z.string().optional(),
  website: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
});

export const contactResponseSchema = z.object({
  contact: contactSchema,
}) satisfies z.ZodType<ContactResponse>;

export const createContactResponseSchema = contactResponseSchema.extend({
  txid: z.string().optional(),
}) satisfies z.ZodType<CreateContactResponse>;

export const mapPinSchema: z.ZodType<MapPin> = z.object({
  avatar: z.string().nullable(),
  firstName: z.string(),
  headline: z.string().nullable(),
  id: z.string(),
  lastInteraction: nullableDateTimeSchema,
  lastName: z.string().nullable(),
  latitude: z.number(),
  location: z.string().nullable(),
  longitude: z.number(),
});

export const mapPinsResponseSchema: z.ZodType<MapPinsResponse> = z.object({
  pins: z.array(mapPinSchema),
});

export const mapAddressPinSchema: z.ZodType<AddressPin> = z.object({
  addressCity: z.string().nullable(),
  addressCountry: z.string().nullable(),
  addressFormatted: z.string().nullable(),
  addressId: z.string(),
  addressType: z.enum(["home", "work", "other"]),
  avatar: z.string().nullable(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  personId: z.string(),
});

export const mapAddressPinsResponseSchema: z.ZodType<MapAddressPinsResponse> = z.object({
  pins: z.array(mapAddressPinSchema),
});

export const contactsListStatsSchema: z.ZodType<ContactsListStats> = z.object({
  newContactsThisYear: z.number(),
  thisMonthInteractions: z.number(),
  totalContacts: z.number(),
});

export const contactsListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactListItemSchema,
).extend({
  stats: contactsListStatsSchema,
}) satisfies z.ZodType<ContactsListResponse>;

export const contactsSelectableListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactSelectableSchema,
) satisfies z.ZodType<ContactsSelectableListResponse>;

export const createContactRelationshipInputSchema = z.object({
  relatedPersonId: contactIdSchema,
  relationshipType: relationshipTypeSchema,
}) satisfies z.ZodType<CreateContactRelationshipInput>;

export const updateContactRelationshipInputSchema = createContactRelationshipInputSchema;

export const contactRelationshipsResponseSchema = makeCollectionResponseSchema(
  "relationships",
  contactRelationshipWithPeopleSchema,
) satisfies z.ZodType<ContactRelationshipsResponse>;

export const contactSortOrderSchema = z.enum([
  "nameAsc",
  "nameDesc",
  "surnameAsc",
  "surnameDesc",
  "interactionAsc",
  "interactionDesc",
  "createdAtAsc",
  "createdAtDesc",
]) satisfies z.ZodType<ContactSortOrder>;

export const contactsFilterSchema: z.ZodType<ContactsFilter> = z.object({
  search: z.string().optional(),
  sort: contactSortOrderSchema.optional(),
});

export const deleteContactsRequestSchema: z.ZodType<DeleteContactsRequest> = z.union([
  idsRequestSchema,
  z.object({
    excludeIds: z.array(contactIdSchema).optional(),
    filter: contactsFilterSchema,
  }),
]);

export const deleteContactsResponseSchema = messageResponseSchema.extend({
  deletedCount: z.number().int().optional(),
}) satisfies z.ZodType<DeleteContactsResponse>;

export const bySocialLookupResponseSchema: z.ZodType<BySocialLookupResponse> = z.object({
  contact: contactPreviewSchema.optional(),
  exists: z.boolean(),
});

export const deleteContactResponseSchema =
  messageResponseSchema satisfies z.ZodType<DeleteContactResponse>;

const linkedInHistoryFieldsSchema = z
  .object({
    peopleLinkedinId: z.string(),
  })
  .extend(entityAuditSchema.shape);

export const workHistoryEntrySchema = entityIdentitySchema.extend({
  ...linkedInHistoryFieldsSchema.shape,
  companyLinkedinUrl: z.string().nullable(),
  companyLogoUrl: z.string().nullable(),
  companyName: z.string(),
  description: z.string().nullable(),
  employmentType: z.string().nullable(),
  endDate: z.string().nullable(),
  location: z.string().nullable(),
  startDate: z.string().nullable(),
  title: z.string().nullable(),
}) satisfies z.ZodType<WorkHistoryEntry>;

export const educationEntrySchema = entityIdentitySchema.extend({
  ...linkedInHistoryFieldsSchema.shape,
  degree: z.string().nullable(),
  description: z.string().nullable(),
  endDate: z.string().nullable(),
  schoolLinkedinUrl: z.string().nullable(),
  schoolLogoUrl: z.string().nullable(),
  schoolName: z.string(),
  startDate: z.string().nullable(),
}) satisfies z.ZodType<EducationEntry>;

export const linkedInDataResponseSchema: z.ZodType<LinkedInDataResponse> = z.object({
  education: z.array(educationEntrySchema),
  linkedinBio: z.string().nullable(),
  syncedAt: nullableDateTimeSchema,
  workHistory: z.array(workHistoryEntrySchema),
});

export const enrichQueueStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]) satisfies z.ZodType<EnrichQueueStatus>;

export const enrichQueueItemSchema = entityIdentitySchema
  .extend({
    errorMessage: z.string().nullable(),
    linkedinHandle: z.string().optional(),
    personId: z.string(),
    status: enrichQueueStatusSchema,
  })
  .extend(entityAuditSchema.shape) satisfies z.ZodType<EnrichQueueItem>;

/** @deprecated Use enrichQueueCountResponseSchema */
export const enrichEligibleCountResponseSchema: z.ZodType<EnrichEligibleCountResponse> = z.object({
  count: z.number(),
});

export const enrichQueueCountResponseSchema: z.ZodType<EnrichQueueCountResponse> = z.object({
  eligibleCount: z.number().int().nonnegative(),
});

export const keepInTouchCountResponseSchema: z.ZodType<KeepInTouchCountResponse> = z.object({
  overdueCount: z.number().int().nonnegative(),
});

export const enrichQueueStatusCountsSchema: z.ZodType<EnrichQueueStatusCounts> = z.object({
  completed: z.number(),
  failed: z.number(),
  pending: z.number(),
});

export const enrichQueueInitResponseSchema: z.ZodType<EnrichQueueInitResponse> = z.object({
  totalEligible: z.number(),
});

export const enrichQueueNextBatchItemSchema: z.ZodType<EnrichQueueNextBatchItem> = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  linkedinHandle: z.string().nullable(),
  personId: z.string(),
  queueItemId: z.string(),
});

export const enrichQueueNextBatchResponseSchema: z.ZodType<EnrichQueueNextBatchResponse> = z.object(
  {
    items: z.array(enrichQueueNextBatchItemSchema),
  },
);

export const linkedInDataUpsertResponseSchema: z.ZodType<LinkedInDataUpsertResponse> = z.object({
  count: z.number(),
  success: z.boolean(),
});

export const contactRelationshipResponseSchema: z.ZodType<ContactRelationshipResponse> = z.object({
  relationship: contactRelationshipSchema,
});

/** POST /api/contacts/enrich-queue/init optional body. */
export const enrichQueueInitBodySchema: z.ZodType<EnrichQueueInitBody> = z
  .object({
    personId: z.string().optional(),
  })
  .optional();

/** PATCH /api/contacts/enrich-queue/:id body. */
export const enrichQueuePatchBodySchema: z.ZodType<EnrichQueuePatchBody> = z.object({
  errorMessage: z.string().nullable().optional(),
  status: z.enum(["completed", "failed"]),
});

export const shareableFieldSchema = z.enum([
  "name",
  "avatar",
  "headline",
  "phones",
  "emails",
  "location",
  "linkedin",
  "instagram",
  "facebook",
  "website",
  "whatsapp",
  "signal",
  "addresses",
  "notes",
  "importantDates",
]) satisfies z.ZodType<ShareableField>;
