import { z } from "zod";
import { CONTACT_FIELD_MAX_LENGTHS } from "#constants/index.js";
import { contactIdSchema } from "#contact-id.js";
import {
  entityAuditSchema,
  entityIdentitySchema,
  idsRequestSchema,
  makeCollectionResponseSchema,
  makePaginatedListResponseSchema,
  messageResponseSchema,
  nullableDateTimeSchema,
} from "#entities/_shared.js";
import { contactAddressReadSchema } from "#entities/address.js";
import { emailEntryEntitySchema, phoneEntryEntitySchema } from "#entities/channels.js";
import { importantDateSchema, replaceImportantDatesSchema } from "#entities/important-date.js";

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
]);

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
  .extend(entityAuditSchema.shape);

export const contactPreviewSchema = contactSchema.pick({
  avatar: true,
  firstName: true,
  id: true,
  lastName: true,
});

/** Lean contact shape for pickers, comboboxes, and activity participant selection. */
export const contactSelectableSchema = contactPreviewSchema.extend({
  headline: z.string().nullable(),
  location: z.string().nullable(),
  middleName: z.string().nullable(),
  myself: z.boolean().nullable(),
});

export type ContactSelectable = z.infer<typeof contactSelectableSchema>;

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
  });

export type ContactListItem = z.infer<typeof contactListItemSchema>;

export const contactRelationshipSchema = entityIdentitySchema
  .extend({
    relationshipType: relationshipTypeSchema,
    sourcePersonId: z.string(),
    targetPersonId: z.string(),
  })
  .extend(entityAuditSchema.shape);

export const contactRelationshipWithPeopleSchema = contactRelationshipSchema.extend({
  sourcePerson: contactPreviewSchema,
  targetPerson: contactPreviewSchema,
});

export const createContactApiInputSchema = z.object({
  firstName: z.string().trim().min(1, { error: "First name is required" }),
  lastName: z.string().optional(),
  linkedin: z.string().optional(),
  middleName: z.string().optional(),
});

/** POST /api/contacts body (optional client-supplied id). */
export const createContactBodySchema = createContactApiInputSchema.extend({
  id: contactIdSchema.optional(),
});

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
  }));

/** POST /api/contacts — minimal create from mobile FAB sheet. */
export const createContactInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, { error: "Name is required" })
    .max(CONTACT_FIELD_MAX_LENGTHS.fullName, {
      error: `Name must be at most ${CONTACT_FIELD_MAX_LENGTHS.fullName} characters`,
    }),
});

export const updateContactInputSchema = contactSchema
  .partial()
  .omit({
    createdAt: true,
    id: true,
    importantDates: true,
  })
  .extend({
    importantDates: replaceImportantDatesSchema.nullable().optional(),
  });

export const contactResponseSchema = z.object({
  contact: contactSchema,
});

export const createContactResponseSchema = contactResponseSchema.extend({
  txid: z.string().optional(),
});

export const mapPinSchema = z.object({
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

export type MapPin = z.infer<typeof mapPinSchema>;

export const mapPinsResponseSchema = z.object({
  pins: z.array(mapPinSchema),
});

export const mapAddressPinSchema = z.object({
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

export type AddressPin = z.infer<typeof mapAddressPinSchema>;

export const mapAddressPinsResponseSchema = z.object({
  pins: z.array(mapAddressPinSchema),
});

export const contactsListStatsSchema = z.object({
  newContactsThisYear: z.number(),
  thisMonthInteractions: z.number(),
  totalContacts: z.number(),
});

export const contactsListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactListItemSchema,
).extend({
  stats: contactsListStatsSchema,
});

export const contactsSelectableListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactSelectableSchema,
);

export const createContactRelationshipInputSchema = z.object({
  relatedPersonId: contactIdSchema,
  relationshipType: relationshipTypeSchema,
});

export const updateContactRelationshipInputSchema = createContactRelationshipInputSchema;

export const contactRelationshipsResponseSchema = makeCollectionResponseSchema(
  "relationships",
  contactRelationshipWithPeopleSchema,
);

export const contactSortOrderSchema = z.enum([
  "nameAsc",
  "nameDesc",
  "surnameAsc",
  "surnameDesc",
  "interactionAsc",
  "interactionDesc",
  "createdAtAsc",
  "createdAtDesc",
]);

export const contactsFilterSchema = z.object({
  search: z.string().optional(),
  sort: contactSortOrderSchema.optional(),
});

export const deleteContactsRequestSchema = z.union([
  idsRequestSchema,
  z.object({
    excludeIds: z.array(contactIdSchema).optional(),
    filter: contactsFilterSchema,
  }),
]);

export const deleteContactsResponseSchema = messageResponseSchema.extend({
  deletedCount: z.number().int().optional(),
});

export const bySocialLookupResponseSchema = z.object({
  contact: contactPreviewSchema.optional(),
  exists: z.boolean(),
});

export const deleteContactResponseSchema = messageResponseSchema;

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
});

export const educationEntrySchema = entityIdentitySchema.extend({
  ...linkedInHistoryFieldsSchema.shape,
  degree: z.string().nullable(),
  description: z.string().nullable(),
  endDate: z.string().nullable(),
  schoolLinkedinUrl: z.string().nullable(),
  schoolLogoUrl: z.string().nullable(),
  schoolName: z.string(),
  startDate: z.string().nullable(),
});

export const linkedInDataResponseSchema = z.object({
  education: z.array(educationEntrySchema),
  linkedinBio: z.string().nullable(),
  syncedAt: nullableDateTimeSchema,
  workHistory: z.array(workHistoryEntrySchema),
});

export const enrichQueueStatusSchema = z.enum(["pending", "processing", "completed", "failed"]);

export const enrichQueueItemSchema = entityIdentitySchema
  .extend({
    errorMessage: z.string().nullable(),
    linkedinHandle: z.string().optional(),
    personId: z.string(),
    status: enrichQueueStatusSchema,
  })
  .extend(entityAuditSchema.shape);

/** @deprecated Use enrichQueueCountResponseSchema */
export const enrichEligibleCountResponseSchema = z.object({
  count: z.number(),
});

export const enrichQueueCountResponseSchema = z.object({
  eligibleCount: z.number().int().nonnegative(),
});

export const keepInTouchCountResponseSchema = z.object({
  overdueCount: z.number().int().nonnegative(),
});

export const enrichQueueStatusCountsSchema = z.object({
  completed: z.number(),
  failed: z.number(),
  pending: z.number(),
});

export const enrichQueueInitResponseSchema = z.object({
  totalEligible: z.number(),
});

export const enrichQueueNextBatchItemSchema = z.object({
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  linkedinHandle: z.string().nullable(),
  personId: z.string(),
  queueItemId: z.string(),
});

export const enrichQueueNextBatchResponseSchema = z.object({
  items: z.array(enrichQueueNextBatchItemSchema),
});

export const linkedInDataUpsertResponseSchema = z.object({
  count: z.number(),
  success: z.boolean(),
});

export const contactRelationshipResponseSchema = z.object({
  relationship: contactRelationshipSchema,
});

/** POST /api/contacts/enrich-queue/init optional body. */
export const enrichQueueInitBodySchema = z
  .object({
    personId: z.string().optional(),
  })
  .optional();

/** PATCH /api/contacts/enrich-queue/:id body. */
export const enrichQueuePatchBodySchema = z.object({
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
]);

export type Contact = z.infer<typeof contactSchema>;
export type ContactPreview = z.infer<typeof contactPreviewSchema>;
export type RelationshipType = z.infer<typeof relationshipTypeSchema>;
export type ContactRelationship = z.infer<typeof contactRelationshipSchema>;
export type ContactRelationshipWithPeople = z.infer<typeof contactRelationshipWithPeopleSchema>;
export type CreateContactInput = z.infer<typeof createContactApiInputSchema>;
export type UpdateContactInput = z.infer<typeof updateContactInputSchema>;
export type ContactsListResponse = z.infer<typeof contactsListResponseSchema>;
export type ContactResponse = z.infer<typeof contactResponseSchema>;
export type CreateContactRelationshipInput = z.infer<typeof createContactRelationshipInputSchema>;
export type UpdateContactRelationshipInput = z.infer<typeof updateContactRelationshipInputSchema>;
export type ContactRelationshipsResponse = z.infer<typeof contactRelationshipsResponseSchema>;
export type ContactsFilter = z.infer<typeof contactsFilterSchema>;
export type DeleteContactsRequest = z.infer<typeof deleteContactsRequestSchema>;
export type WorkHistoryEntry = z.infer<typeof workHistoryEntrySchema>;
export type EducationEntry = z.infer<typeof educationEntrySchema>;
export type LinkedInDataResponse = z.infer<typeof linkedInDataResponseSchema>;
export type EnrichQueueStatus = z.infer<typeof enrichQueueStatusSchema>;
export type EnrichQueueItem = z.infer<typeof enrichQueueItemSchema>;
export type EnrichEligibleCountResponse = z.infer<typeof enrichEligibleCountResponseSchema>;
export type EnrichQueueCountResponse = z.infer<typeof enrichQueueCountResponseSchema>;
export type KeepInTouchCountResponse = z.infer<typeof keepInTouchCountResponseSchema>;
export type EnrichQueueStatusCounts = z.infer<typeof enrichQueueStatusCountsSchema>;
export type EnrichQueueInitResponse = z.infer<typeof enrichQueueInitResponseSchema>;
export type EnrichQueueNextBatchItem = z.infer<typeof enrichQueueNextBatchItemSchema>;
export type EnrichQueueNextBatchResponse = z.infer<typeof enrichQueueNextBatchResponseSchema>;
export type LinkedInDataUpsertResponse = z.infer<typeof linkedInDataUpsertResponseSchema>;
export type ContactRelationshipResponse = z.infer<typeof contactRelationshipResponseSchema>;
export type EnrichQueueInitBody = z.infer<typeof enrichQueueInitBodySchema>;
export type EnrichQueuePatchBody = z.infer<typeof enrichQueuePatchBodySchema>;
export type ShareableField = z.infer<typeof shareableFieldSchema>;
export type UpdateContactIdentityInput = z.infer<typeof updateContactIdentitySchema>;
