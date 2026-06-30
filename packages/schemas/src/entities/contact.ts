import { z } from "zod";
import { CONTACT_FIELD_MAX_LENGTHS } from "../constants/index.js";
import { contactAddressEntrySchema } from "./address.js";
import { emailEntryEntitySchema, phoneEntryEntitySchema } from "./channels.js";
import { importantDateSchema } from "./important-date.js";
import {
  createdAtSchema,
  entityAuditSchema,
  entityIdentitySchema,
  idsRequestSchema,
  makeCollectionResponseSchema,
  makePaginatedListResponseSchema,
  updatedAtSchema,
} from "./_shared.js";

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
  createdAt: createdAtSchema,
  updatedAt: updatedAtSchema.nullable().optional(),
  phones: z.array(phoneEntryEntitySchema).nullable(),
  emails: z.array(emailEntryEntitySchema).nullable(),
  addresses: z.array(contactAddressEntrySchema).nullable().optional(),
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
  gisPoint: z.string().nullable(),
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
}).extend(entityAuditSchema.shape);

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

export const contactResponseSchema = z.object({
  contact: contactSchema,
});

export const contactsListStatsSchema = z.object({
  totalContacts: z.number(),
  thisMonthInteractions: z.number(),
  newContactsThisYear: z.number(),
});

export const contactsListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactSchema,
).extend({
  stats: contactsListStatsSchema,
});

export const createContactRelationshipInputSchema = z.object({
  relatedPersonId: z.string(),
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
    filter: contactsFilterSchema,
    excludeIds: z.array(z.string()).optional(),
  }),
]);

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

export const linkedInDataResponseSchema = z.object({
  linkedinBio: z.string().nullable(),
  syncedAt: z.string().nullable(),
  workHistory: z.array(workHistoryEntrySchema),
  education: z.array(educationEntrySchema),
});

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
  createdAt: createdAtSchema,
  updatedAt: updatedAtSchema,
  linkedinHandle: z.string().optional(),
});

export const enrichEligibleCountResponseSchema = z.object({
  count: z.number(),
});

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
export type EnrichQueueInitBody = z.infer<typeof enrichQueueInitBodySchema>;
export type EnrichQueuePatchBody = z.infer<typeof enrichQueuePatchBodySchema>;
export type ShareableField = z.infer<typeof shareableFieldSchema>;
export type UpdateContactIdentityInput = z.infer<typeof updateContactIdentitySchema>;
