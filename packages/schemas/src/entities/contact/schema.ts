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
import { importantDateSchema } from "../important-date/schema.js";
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
  ContactShareFieldPreview,
  ContactSharePreviewResponse,
  ContactSortOrder,
  ContactsFilter,
  ContactsListResponse,
  ContactsListStats,
  ContactsSelectableListResponse,
  ContactWritableFields,
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
  PersonPreview,
  RelationshipGraphEdge,
  RelationshipGraphGroup,
  RelationshipGraphHub,
  RelationshipGraphNode,
  RelationshipGraphResponse,
  RelationshipGraphUnlinkedPerson,
  RelationshipType,
  ShareableField,
  UpdateContactIdentityInput,
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
    addresses: z
      .array(contactAddressReadSchema)
      .nullable()
      .optional()
      .describe("Postal addresses for this contact"),
    avatar: z.string().nullable().describe("Avatar image URL, or null when unset"),
    emails: z.array(emailEntryEntitySchema).nullable().describe("Email addresses for this contact"),
    facebook: z.string().nullable().describe("Facebook profile URL or handle"),
    firstName: z.string().describe("Given name"),
    gisPoint: z.unknown().nullable().describe("PostGIS point for map placement"),
    headline: z.string().nullable().describe("Short role or description line"),
    importantDates: z
      .array(importantDateSchema)
      .nullable()
      .optional()
      .describe("Birthdays and other recurring dates"),
    instagram: z.string().nullable().describe("Instagram profile URL or handle"),
    keepFrequencyDays: z
      .number()
      .nullable()
      .describe("Days between keep-in-touch reminders. Null disables reminders."),
    language: z.string().nullable().describe("Preferred language tag"),
    lastInteraction: nullableDateTimeSchema.describe("Timestamp of the most recent interaction"),
    lastInteractionActivityId: z
      .string()
      .nullable()
      .describe("Identifier of the most recent interaction"),
    lastName: z.string().nullable().describe("Family name"),
    latitude: z.number().nullable().describe("Latitude in decimal degrees"),
    linkedin: z.string().nullable().describe("LinkedIn profile URL"),
    location: z.string().nullable().describe("Free-text location"),
    longitude: z.number().nullable().describe("Longitude in decimal degrees"),
    middleName: z.string().nullable().describe("Middle name"),
    myself: z.boolean().nullable().describe("True when this contact is the account owner"),
    notes: z.string().nullable().describe("Free-text notes"),
    notesUpdatedAt: nullableDateTimeSchema.optional().describe("Timestamp of the last notes edit"),
    phones: z.array(phoneEntryEntitySchema).nullable().describe("Phone numbers for this contact"),
    position: z.unknown().nullable().optional().describe("Custom position payload"),
    signal: z.string().nullable().describe("Signal username"),
    timezone: z.string().nullable().describe("IANA timezone name"),
    website: z.string().nullable().describe("Personal or company website URL"),
    whatsapp: z.string().nullable().describe("WhatsApp number"),
  })
  .extend(entityAuditSchema.shape) satisfies z.ZodType<Contact>;

export const contactPreviewSchema = contactSchema.pick({
  avatar: true,
  firstName: true,
  id: true,
  lastName: true,
}) satisfies z.ZodType<ContactPreview>;

/** Identity plus the optional display lines that hover cards render. */
export const personPreviewSchema = contactPreviewSchema.extend({
  headline: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  middleName: z.string().nullable().optional(),
}) satisfies z.ZodType<PersonPreview>;

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

/** Writable contact fields shared by create and the applied update path. */
export const contactWritableFieldsSchema = z.object({
  addresses: z
    .array(contactAddressReadSchema)
    .nullable()
    .optional()
    .describe("Postal addresses. Replaces the full set when present."),
  emails: z
    .array(emailEntryEntitySchema)
    .nullable()
    .optional()
    .describe("Email addresses. Replaces the full set when present."),
  facebook: z.string().nullable().optional().describe("Facebook profile URL or handle"),
  firstName: z.string().optional().describe("Given name"),
  gisPoint: z.unknown().nullable().optional().describe("PostGIS point for map placement"),
  headline: z.string().nullable().optional().describe("Short role or description line"),
  instagram: z.string().nullable().optional().describe("Instagram profile URL or handle"),
  keepFrequencyDays: z
    .number()
    .nullable()
    .optional()
    .describe("Days between keep-in-touch reminders. Null disables reminders."),
  language: z.string().nullable().optional().describe("Preferred language tag"),
  lastInteraction: nullableDateTimeSchema
    .optional()
    .describe("Timestamp of the most recent interaction"),
  lastName: z.string().nullable().optional().describe("Family name"),
  latitude: z.number().nullable().optional().describe("Latitude in decimal degrees"),
  linkedin: z.string().nullable().optional().describe("LinkedIn profile URL"),
  location: z.string().nullable().optional().describe("Free-text location"),
  longitude: z.number().nullable().optional().describe("Longitude in decimal degrees"),
  middleName: z.string().nullable().optional().describe("Middle name"),
  notes: z.string().nullable().optional().describe("Free-text notes"),
  phones: z
    .array(phoneEntryEntitySchema)
    .nullable()
    .optional()
    .describe("Phone numbers. Replaces the full set when present."),
  signal: z.string().nullable().optional().describe("Signal username"),
  timezone: z.string().nullable().optional().describe("IANA timezone name"),
  website: z.string().nullable().optional().describe("Personal or company website URL"),
  whatsapp: z.string().nullable().optional().describe("WhatsApp number"),
}) satisfies z.ZodType<ContactWritableFields>;

export const createContactApiInputSchema = contactWritableFieldsSchema.extend({
  firstName: z.string().trim().min(1, { error: "First name is required" }),
}) satisfies z.ZodType<CreateContactInput>;

/** POST /api/contacts body (optional client-supplied id). */
export const createContactBodySchema = createContactApiInputSchema.extend({
  id: contactIdSchema
    .optional()
    .describe("Client-supplied contact id. The API generates one when omitted."),
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

/** PATCH body — same writable fields as create extras / MCP update. */
export const updateContactInputSchema = contactWritableFieldsSchema;

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

export const relationshipGraphNodeSchema = z.object({
  avatar: z.string().nullable(),
  firstName: z.string(),
  headline: z.string().nullable(),
  id: z.string(),
  lastName: z.string().nullable(),
  location: z.string().nullable(),
  middleName: z.string().nullable(),
  myself: z.boolean(),
}) satisfies z.ZodType<RelationshipGraphNode>;

export const relationshipGraphEdgeSchema = z.object({
  id: z.string(),
  relationshipType: relationshipTypeSchema,
  sourcePersonId: z.string(),
  targetPersonId: z.string(),
}) satisfies z.ZodType<RelationshipGraphEdge>;

export const relationshipGraphUnlinkedPersonSchema = z.object({
  firstName: z.string(),
  id: z.string(),
  lastName: z.string().nullable(),
}) satisfies z.ZodType<RelationshipGraphUnlinkedPerson>;

export const relationshipGraphHubSchema = z.object({
  id: z.string(),
  kind: z.enum(["company", "school"]),
  label: z.string(),
  logoUrl: z.string().nullable(),
  memberCount: z.number().int().nonnegative(),
  personIds: z.array(z.string()),
}) satisfies z.ZodType<RelationshipGraphHub>;

export const relationshipGraphGroupSchema = z.object({
  color: z.string().nullable(),
  emoji: z.string().nullable(),
  id: z.string(),
  label: z.string(),
  personIds: z.array(z.string()),
}) satisfies z.ZodType<RelationshipGraphGroup>;

export const relationshipGraphResponseSchema = z.object({
  graph: z.object({
    edges: z.array(relationshipGraphEdgeSchema),
    groups: z.array(relationshipGraphGroupSchema),
    hubs: z.array(relationshipGraphHubSchema),
    nodes: z.array(relationshipGraphNodeSchema),
    truncated: z.boolean(),
    unlinked: z.array(relationshipGraphUnlinkedPersonSchema),
    unlinkedCount: z.number().int().nonnegative(),
  }),
}) satisfies z.ZodType<RelationshipGraphResponse>;

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
  tagIds: z.array(z.string().uuid()).max(20).optional(),
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

export const contactShareFieldPreviewSchema = z.object({
  field: shareableFieldSchema,
  preview: z.string(),
}) satisfies z.ZodType<ContactShareFieldPreview>;

export const contactSharePreviewResponseSchema = z.object({
  availableFields: z.array(contactShareFieldPreviewSchema),
  contactId: z.string(),
  contactName: z.string(),
}) satisfies z.ZodType<ContactSharePreviewResponse>;
