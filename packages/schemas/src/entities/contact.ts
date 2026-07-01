import { z } from "zod";
import { CONTACT_FIELD_MAX_LENGTHS } from "#constants/index.js";
import { contactAddressReadSchema } from "#entities/address.js";
import { emailEntryEntitySchema, phoneEntryEntitySchema } from "#entities/channels.js";
import { importantDateSchema } from "#entities/important-date.js";
import { contactIdSchema } from "#contact-id.js";
import {
  createdAtSchema,
  entityIdentitySchema,
  entityNullableAuditSchema,
  idsRequestSchema,
  makeCollectionResponseSchema,
  makePaginatedListResponseSchema,
  messageResponseSchema,
  updatedAtSchema,
} from "#entities/_shared.js";
import {
  EXAMPLE_BY_SOCIAL_LOOKUP_RESPONSE,
  EXAMPLE_CONTACT_RELATIONSHIP_RESPONSE,
  EXAMPLE_CONTACT_RELATIONSHIPS_RESPONSE,
  EXAMPLE_CONTACT_RESPONSE,
  EXAMPLE_CONTACTS_LIST_RESPONSE,
  EXAMPLE_CREATE_CONTACT_RESPONSE,
  EXAMPLE_DELETE_CONTACTS_RESPONSE,
  EXAMPLE_ENRICH_ELIGIBLE_COUNT_RESPONSE,
  EXAMPLE_ENRICH_QUEUE_INIT_RESPONSE,
  EXAMPLE_ENRICH_QUEUE_NEXT_BATCH_RESPONSE,
  EXAMPLE_ENRICH_QUEUE_STATUS_COUNTS_RESPONSE,
  EXAMPLE_LINKEDIN_DATA_RESPONSE,
  EXAMPLE_LINKEDIN_DATA_UPSERT_RESPONSE,
  EXAMPLE_MAP_ADDRESS_PINS_RESPONSE,
  EXAMPLE_MAP_PINS_RESPONSE,
  EXAMPLE_MESSAGE_RESPONSE,
} from "#openapi/fixtures/schema-examples.js";

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

export const contactSchema = entityIdentitySchema.extend({
  firstName: z.string(),
  middleName: z.string().nullable(),
  lastName: z.string().nullable(),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  notes: z.string().nullable(),
  notesUpdatedAt: z.string().nullable().optional(),
  avatar: z.string().nullable(),
  lastInteraction: z.string().nullable(),
  lastInteractionActivityId: z.string().nullable(),
  keepFrequencyDays: z.number().nullable(),
  createdAt: createdAtSchema.nullable(),
  updatedAt: updatedAtSchema.nullable().optional(),
  phones: z.array(phoneEntryEntitySchema).nullable(),
  emails: z.array(emailEntryEntitySchema).nullable(),
  addresses: z.array(contactAddressReadSchema).nullable().optional(),
  linkedin: z.string().nullable(),
  instagram: z.string().nullable(),
  whatsapp: z.string().nullable(),
  facebook: z.string().nullable(),
  website: z.string().nullable(),
  signal: z.string().nullable(),
  importantDates: z.array(importantDateSchema).nullable().optional(),
  myself: z.boolean().nullable(),
  position: z.unknown().nullable().optional(),
  language: z.string().nullable(),
  timezone: z.string().nullable(),
  gisPoint: z.unknown().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

export const contactPreviewSchema = contactSchema.pick({
  id: true,
  firstName: true,
  lastName: true,
  avatar: true,
});

export const contactRelationshipSchema = entityIdentitySchema.extend({
  sourcePersonId: z.string(),
  targetPersonId: z.string(),
  relationshipType: relationshipTypeSchema,
}).extend(entityNullableAuditSchema.shape);

export const contactRelationshipWithPeopleSchema = contactRelationshipSchema.extend({
  sourcePerson: contactPreviewSchema,
  targetPerson: contactPreviewSchema,
});

export const createContactApiInputSchema = z.object({
  firstName: z.string().trim().min(1, { error: "First name is required" }),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  linkedin: z.string().optional(),
});

/** PATCH /api/contacts/:id — identity fields edited from mobile identity sheet. */
export const updateContactIdentitySchema = z
  .object({
    firstName: trimmedNameField(CONTACT_FIELD_MAX_LENGTHS.firstName, "First name").min(1, {
      error: "First name is required",
    }),
    middleName: z.string().trim().max(CONTACT_FIELD_MAX_LENGTHS.middleName, {
      error: `Middle name must be at most ${CONTACT_FIELD_MAX_LENGTHS.middleName} characters`,
    }),
    lastName: z.string().trim().max(CONTACT_FIELD_MAX_LENGTHS.lastName, {
      error: `Last name must be at most ${CONTACT_FIELD_MAX_LENGTHS.lastName} characters`,
    }),
    headline: z.string().trim().max(CONTACT_FIELD_MAX_LENGTHS.headline, {
      error: `Headline must be at most ${CONTACT_FIELD_MAX_LENGTHS.headline} characters`,
    }),
  })
  .transform(({ firstName, middleName, lastName, headline }) => ({
    firstName,
    middleName: middleName || null,
    lastName: lastName || null,
    headline: headline || null,
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

export const updateContactInputSchema = contactSchema.partial().omit({
  id: true,
  createdAt: true,
});

export const contactResponseSchema = z
  .object({
    contact: contactSchema,
  })
  .meta({ example: EXAMPLE_CONTACT_RESPONSE });

export const createContactResponseSchema = contactResponseSchema
  .extend({
    txid: z.string().optional(),
  })
  .meta({ example: EXAMPLE_CREATE_CONTACT_RESPONSE });

const mapPinSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  headline: z.string().nullable(),
  location: z.string().nullable(),
  lastInteraction: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  avatar: z.string().nullable(),
});

export const mapPinsResponseSchema = z
  .object({
    pins: z.array(mapPinSchema),
  })
  .meta({ example: EXAMPLE_MAP_PINS_RESPONSE });

const mapAddressPinSchema = z.object({
  addressId: z.string(),
  personId: z.string(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  addressType: z.string(),
  addressFormatted: z.string().nullable(),
  addressCity: z.string().nullable(),
  addressCountry: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  avatar: z.string().nullable(),
});

export const mapAddressPinsResponseSchema = z
  .object({
    pins: z.array(mapAddressPinSchema),
  })
  .meta({ example: EXAMPLE_MAP_ADDRESS_PINS_RESPONSE });

export const contactsListStatsSchema = z.object({
  totalContacts: z.number(),
  thisMonthInteractions: z.number(),
  newContactsThisYear: z.number(),
});

export const contactsListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactSchema,
)
  .extend({
    stats: contactsListStatsSchema,
  })
  .meta({ example: EXAMPLE_CONTACTS_LIST_RESPONSE });

export const createContactRelationshipInputSchema = z.object({
  relatedPersonId: contactIdSchema,
  relationshipType: relationshipTypeSchema,
});

export const updateContactRelationshipInputSchema = createContactRelationshipInputSchema;

export const contactRelationshipsResponseSchema = makeCollectionResponseSchema(
  "relationships",
  contactRelationshipWithPeopleSchema,
).meta({ example: EXAMPLE_CONTACT_RELATIONSHIPS_RESPONSE });

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
    filter: contactsFilterSchema,
    excludeIds: z.array(contactIdSchema).optional(),
  }),
]);

export const deleteContactsResponseSchema = messageResponseSchema
  .extend({
    deletedCount: z.number().int().optional(),
  })
  .meta({ example: EXAMPLE_DELETE_CONTACTS_RESPONSE });

export const bySocialLookupResponseSchema = z
  .object({
    exists: z.boolean(),
    contact: contactPreviewSchema.optional(),
  })
  .meta({ example: EXAMPLE_BY_SOCIAL_LOOKUP_RESPONSE });

export const deleteContactResponseSchema = messageResponseSchema.meta({
  example: EXAMPLE_MESSAGE_RESPONSE,
});

const linkedInHistoryFieldsSchema = z.object({
  peopleLinkedinId: z.string(),
  createdAt: createdAtSchema,
  updatedAt: updatedAtSchema,
});

export const workHistoryEntrySchema = entityIdentitySchema.extend({
  ...linkedInHistoryFieldsSchema.shape,
  companyName: z.string(),
  companyLinkedinUrl: z.string().nullable(),
  companyLogoUrl: z.string().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  employmentType: z.string().nullable(),
  location: z.string().nullable(),
});

export const educationEntrySchema = entityIdentitySchema.extend({
  ...linkedInHistoryFieldsSchema.shape,
  schoolName: z.string(),
  schoolLinkedinUrl: z.string().nullable(),
  schoolLogoUrl: z.string().nullable(),
  degree: z.string().nullable(),
  description: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});

export const linkedInDataResponseSchema = z
  .object({
    linkedinBio: z.string().nullable(),
    syncedAt: z.string().nullable(),
    workHistory: z.array(workHistoryEntrySchema),
    education: z.array(educationEntrySchema),
  })
  .meta({ example: EXAMPLE_LINKEDIN_DATA_RESPONSE });

export const enrichQueueStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const enrichQueueItemSchema = entityIdentitySchema.extend({
  personId: z.string(),
  status: enrichQueueStatusSchema,
  errorMessage: z.string().nullable(),
  createdAt: createdAtSchema.nullable(),
  updatedAt: updatedAtSchema.nullable(),
  linkedinHandle: z.string().optional(),
});

export const enrichEligibleCountResponseSchema = z
  .object({
    count: z.number(),
  })
  .meta({ example: EXAMPLE_ENRICH_ELIGIBLE_COUNT_RESPONSE });

export const enrichQueueStatusCountsSchema = z
  .object({
    pending: z.number(),
    completed: z.number(),
    failed: z.number(),
  })
  .meta({ example: EXAMPLE_ENRICH_QUEUE_STATUS_COUNTS_RESPONSE });

export const enrichQueueInitResponseSchema = z
  .object({
    totalEligible: z.number(),
  })
  .meta({ example: EXAMPLE_ENRICH_QUEUE_INIT_RESPONSE });

export const enrichQueueNextBatchItemSchema = z.object({
  queueItemId: z.string(),
  personId: z.string(),
  linkedinHandle: z.string().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});

export const enrichQueueNextBatchResponseSchema = z
  .object({
    items: z.array(enrichQueueNextBatchItemSchema),
  })
  .meta({ example: EXAMPLE_ENRICH_QUEUE_NEXT_BATCH_RESPONSE });

export const linkedInDataUpsertResponseSchema = z
  .object({
    success: z.boolean(),
    count: z.number(),
  })
  .meta({ example: EXAMPLE_LINKEDIN_DATA_UPSERT_RESPONSE });

export const contactRelationshipResponseSchema = z
  .object({
    relationship: contactRelationshipSchema,
  })
  .meta({ example: EXAMPLE_CONTACT_RELATIONSHIP_RESPONSE });

/** POST /api/contacts/enrich-queue/init optional body. */
export const enrichQueueInitBodySchema = z
  .object({
    personId: z.string().optional(),
  })
  .optional();

/** PATCH /api/contacts/enrich-queue/:id body. */
export const enrichQueuePatchBodySchema = z.object({
  status: z.enum(["completed", "failed"]),
  errorMessage: z.string().nullable().optional(),
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
