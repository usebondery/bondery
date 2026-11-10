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

export const relationshipTypeSchema = z
  .enum([
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
  ])
  .describe("Kind of relationship between the two contacts") satisfies z.ZodType<RelationshipType>;

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
  headline: z.string().nullable().optional().describe("Short role or description line"),
  location: z.string().nullable().optional().describe("Free-text location"),
  middleName: z.string().nullable().optional().describe("Middle name"),
}) satisfies z.ZodType<PersonPreview>;

/** Lean contact shape for pickers, comboboxes, and activity participant selection. */
export const contactSelectableSchema = contactPreviewSchema.extend({
  headline: z.string().nullable().describe("Short role or description line"),
  location: z.string().nullable().describe("Free-text location"),
  middleName: z.string().nullable().describe("Middle name"),
  myself: z.boolean().nullable().describe("True when this contact is the account owner"),
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
    addresses: z
      .array(contactAddressReadSchema)
      .optional()
      .describe("Postal addresses for this contact"),
  }) satisfies z.ZodType<ContactListItem>;

export const contactRelationshipSchema = entityIdentitySchema
  .extend({
    relationshipType: relationshipTypeSchema,
    sourcePersonId: z.string().describe("Identifier of the source contact"),
    targetPersonId: z.string().describe("Identifier of the related contact"),
  })
  .extend(entityAuditSchema.shape) satisfies z.ZodType<ContactRelationship>;

export const contactRelationshipWithPeopleSchema = contactRelationshipSchema.extend({
  sourcePerson: contactPreviewSchema.describe("Source contact preview"),
  targetPerson: contactPreviewSchema.describe("Related contact preview"),
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
  firstName: z.string().trim().min(1, { error: "First name is required" }).describe("Given name"),
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
    firstName: trimmedNameField(CONTACT_FIELD_MAX_LENGTHS.firstName, "First name")
      .min(1, {
        error: "First name is required",
      })
      .describe("Given name"),
    headline: z
      .string()
      .trim()
      .max(CONTACT_FIELD_MAX_LENGTHS.headline, {
        error: `Headline must be at most ${CONTACT_FIELD_MAX_LENGTHS.headline} characters`,
      })
      .describe("Short role or description line"),
    lastName: z
      .string()
      .trim()
      .max(CONTACT_FIELD_MAX_LENGTHS.lastName, {
        error: `Last name must be at most ${CONTACT_FIELD_MAX_LENGTHS.lastName} characters`,
      })
      .describe("Family name"),
    middleName: z
      .string()
      .trim()
      .max(CONTACT_FIELD_MAX_LENGTHS.middleName, {
        error: `Middle name must be at most ${CONTACT_FIELD_MAX_LENGTHS.middleName} characters`,
      })
      .describe("Middle name"),
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
    })
    .describe("Full name. The API splits this into given, middle, and family names."),
}) satisfies z.ZodType<CreateContactFromFullNameInput>;

/** PATCH body — same writable fields as create extras / MCP update. */
export const updateContactInputSchema = contactWritableFieldsSchema;

export const contactResponseSchema = z.object({
  contact: contactSchema.describe("Contact record"),
}) satisfies z.ZodType<ContactResponse>;

export const createContactResponseSchema = contactResponseSchema.extend({
  txid: z.string().optional().describe("Sync transaction identifier for this write"),
}) satisfies z.ZodType<CreateContactResponse>;

export const mapPinSchema: z.ZodType<MapPin> = z.object({
  avatar: z.string().nullable().describe("Avatar image URL, or null when unset"),
  firstName: z.string().describe("Given name"),
  headline: z.string().nullable().describe("Short role or description line"),
  id: z.string().describe("Contact identifier"),
  lastInteraction: nullableDateTimeSchema.describe("Timestamp of the most recent interaction"),
  lastName: z.string().nullable().describe("Family name"),
  latitude: z.number().describe("Latitude in decimal degrees"),
  location: z.string().nullable().describe("Free-text location"),
  longitude: z.number().describe("Longitude in decimal degrees"),
});

export const mapPinsResponseSchema: z.ZodType<MapPinsResponse> = z.object({
  pins: z.array(mapPinSchema).describe("Map pins for contacts in the requested bounds"),
});

export const mapAddressPinSchema: z.ZodType<AddressPin> = z.object({
  addressCity: z.string().nullable().describe("City name"),
  addressCountry: z.string().nullable().describe("Country name"),
  addressFormatted: z.string().nullable().describe("Full address on one line"),
  addressId: z.string().describe("Address identifier"),
  addressType: z.enum(["home", "work", "other"]).describe("Address category"),
  avatar: z.string().nullable().describe("Avatar image URL, or null when unset"),
  firstName: z.string().describe("Given name"),
  lastName: z.string().nullable().describe("Family name"),
  latitude: z.number().describe("Latitude in decimal degrees"),
  longitude: z.number().describe("Longitude in decimal degrees"),
  personId: z.string().describe("Contact identifier"),
});

export const mapAddressPinsResponseSchema: z.ZodType<MapAddressPinsResponse> = z.object({
  pins: z.array(mapAddressPinSchema).describe("Map pins for addresses in the requested bounds"),
});

export const contactsListStatsSchema: z.ZodType<ContactsListStats> = z.object({
  newContactsThisYear: z
    .number()
    .describe("Contacts created in the current calendar year, excluding the account owner"),
  thisMonthInteractions: z.number().describe("Interactions logged in the current calendar month"),
  totalContacts: z.number().describe("Total contacts in the account, excluding the account owner"),
});

export const contactsListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactListItemSchema,
).extend({
  stats: contactsListStatsSchema.describe("Aggregate contact counts for the account"),
}) satisfies z.ZodType<ContactsListResponse>;

export const contactsSelectableListResponseSchema = makePaginatedListResponseSchema(
  "contacts",
  contactSelectableSchema,
) satisfies z.ZodType<ContactsSelectableListResponse>;

export const createContactRelationshipInputSchema = z.object({
  relatedPersonId: contactIdSchema.describe("Identifier of the related contact"),
  relationshipType: relationshipTypeSchema,
}) satisfies z.ZodType<CreateContactRelationshipInput>;

export const updateContactRelationshipInputSchema = createContactRelationshipInputSchema;

export const contactRelationshipsResponseSchema = makeCollectionResponseSchema(
  "relationships",
  contactRelationshipWithPeopleSchema,
) satisfies z.ZodType<ContactRelationshipsResponse>;

export const relationshipGraphNodeSchema = z.object({
  avatar: z.string().nullable().describe("Avatar image URL, or null when unset"),
  firstName: z.string().describe("Given name"),
  headline: z.string().nullable().describe("Short role or description line"),
  id: z.string().describe("Contact identifier"),
  lastName: z.string().nullable().describe("Family name"),
  location: z.string().nullable().describe("Free-text location"),
  middleName: z.string().nullable().describe("Middle name"),
  myself: z.boolean().describe("True when this contact is the account owner"),
}) satisfies z.ZodType<RelationshipGraphNode>;

export const relationshipGraphEdgeSchema = z.object({
  id: z.string().describe("Relationship identifier"),
  relationshipType: relationshipTypeSchema,
  sourcePersonId: z.string().describe("Identifier of the source contact"),
  targetPersonId: z.string().describe("Identifier of the related contact"),
}) satisfies z.ZodType<RelationshipGraphEdge>;

export const relationshipGraphUnlinkedPersonSchema = z.object({
  firstName: z.string().describe("Given name"),
  id: z.string().describe("Contact identifier"),
  lastName: z.string().nullable().describe("Family name"),
}) satisfies z.ZodType<RelationshipGraphUnlinkedPerson>;

export const relationshipGraphHubSchema = z.object({
  id: z.string().describe("Hub identifier"),
  kind: z.enum(["company", "school"]).describe("Whether this hub is a company or a school"),
  label: z.string().describe("Display name of the company or school"),
  logoUrl: z.string().nullable().describe("Logo image URL, or null when unset"),
  memberCount: z.number().int().nonnegative().describe("Number of contacts in this hub"),
  personIds: z.array(z.string()).describe("Contact identifiers in this hub"),
}) satisfies z.ZodType<RelationshipGraphHub>;

export const relationshipGraphGroupSchema = z.object({
  color: z.string().nullable().describe("Hex color used for the group chip"),
  emoji: z.string().nullable().describe("Emoji shown on the group chip"),
  id: z.string().describe("Group identifier"),
  label: z.string().describe("Group name"),
  personIds: z.array(z.string()).describe("Contact identifiers in this group"),
}) satisfies z.ZodType<RelationshipGraphGroup>;

export const relationshipGraphResponseSchema = z.object({
  graph: z
    .object({
      edges: z.array(relationshipGraphEdgeSchema).describe("Relationships between contacts"),
      groups: z.array(relationshipGraphGroupSchema).describe("Group clusters"),
      hubs: z.array(relationshipGraphHubSchema).describe("Company and school hubs"),
      nodes: z.array(relationshipGraphNodeSchema).describe("Contacts in the graph"),
      truncated: z
        .boolean()
        .describe("True when the graph omits contacts to stay within the limit"),
      unlinked: z
        .array(relationshipGraphUnlinkedPersonSchema)
        .describe("Contacts with no relationship edge in this graph"),
      unlinkedCount: z
        .number()
        .int()
        .nonnegative()
        .describe("Number of contacts with no relationship edge"),
    })
    .describe("Relationship graph payload"),
}) satisfies z.ZodType<RelationshipGraphResponse>;

export const contactSortOrderSchema = z
  .enum([
    "nameAsc",
    "nameDesc",
    "surnameAsc",
    "surnameDesc",
    "interactionAsc",
    "interactionDesc",
    "createdAtAsc",
    "createdAtDesc",
  ])
  .describe("Contact list sort order") satisfies z.ZodType<ContactSortOrder>;

export const contactsFilterSchema: z.ZodType<ContactsFilter> = z.object({
  search: z
    .string()
    .optional()
    .describe("Case-insensitive text search across name, email, and phone"),
  sort: contactSortOrderSchema.optional(),
  tagIds: z
    .array(z.string().uuid())
    .max(20)
    .optional()
    .describe("Return only contacts that have any of these tags"),
});

export const deleteContactsRequestSchema: z.ZodType<DeleteContactsRequest> = z.union([
  idsRequestSchema,
  z.object({
    excludeIds: z.array(contactIdSchema).optional().describe("Contact identifiers to keep"),
    filter: contactsFilterSchema.describe("Filter that selects contacts to delete"),
  }),
]);

export const deleteContactsResponseSchema = messageResponseSchema.extend({
  deletedCount: z.number().int().optional().describe("Number of contacts deleted"),
}) satisfies z.ZodType<DeleteContactsResponse>;

export const bySocialLookupResponseSchema: z.ZodType<BySocialLookupResponse> = z.object({
  contact: contactPreviewSchema.optional().describe("Matching contact, when one exists"),
  exists: z.boolean().describe("True when a contact already has this social handle"),
});

export const deleteContactResponseSchema =
  messageResponseSchema satisfies z.ZodType<DeleteContactResponse>;

const linkedInHistoryFieldsSchema = z
  .object({
    peopleLinkedinId: z.string().describe("LinkedIn profile identifier this row belongs to"),
  })
  .extend(entityAuditSchema.shape);

export const workHistoryEntrySchema = entityIdentitySchema.extend({
  ...linkedInHistoryFieldsSchema.shape,
  companyLinkedinUrl: z.string().nullable().describe("LinkedIn URL for the company"),
  companyLogoUrl: z.string().nullable().describe("Company logo image URL"),
  companyName: z.string().describe("Company name"),
  description: z.string().nullable().describe("Role description"),
  employmentType: z.string().nullable().describe("Employment type, such as full-time"),
  endDate: z.string().nullable().describe("End date. Null when this role is current."),
  location: z.string().nullable().describe("Free-text location"),
  startDate: z.string().nullable().describe("Start date"),
  title: z.string().nullable().describe("Job title"),
}) satisfies z.ZodType<WorkHistoryEntry>;

export const educationEntrySchema = entityIdentitySchema.extend({
  ...linkedInHistoryFieldsSchema.shape,
  degree: z.string().nullable().describe("Degree or program name"),
  description: z.string().nullable().describe("Education description"),
  endDate: z.string().nullable().describe("End date. Null when this program is current."),
  schoolLinkedinUrl: z.string().nullable().describe("LinkedIn URL for the school"),
  schoolLogoUrl: z.string().nullable().describe("School logo image URL"),
  schoolName: z.string().describe("School name"),
  startDate: z.string().nullable().describe("Start date"),
}) satisfies z.ZodType<EducationEntry>;

export const linkedInDataResponseSchema: z.ZodType<LinkedInDataResponse> = z.object({
  education: z.array(educationEntrySchema).describe("Education history from LinkedIn"),
  linkedinBio: z.string().nullable().describe("LinkedIn about text"),
  syncedAt: nullableDateTimeSchema.describe("Time of the last LinkedIn data sync"),
  workHistory: z.array(workHistoryEntrySchema).describe("Work history from LinkedIn"),
});

export const enrichQueueStatusSchema = z
  .enum(["pending", "processing", "completed", "failed"])
  .describe("Enrichment queue item status") satisfies z.ZodType<EnrichQueueStatus>;

export const enrichQueueItemSchema = entityIdentitySchema
  .extend({
    errorMessage: z.string().nullable().describe("Failure message, when status is failed"),
    linkedinHandle: z.string().optional().describe("LinkedIn handle to enrich"),
    personId: z.string().describe("Contact identifier"),
    status: enrichQueueStatusSchema,
  })
  .extend(entityAuditSchema.shape) satisfies z.ZodType<EnrichQueueItem>;

/** @deprecated Use enrichQueueCountResponseSchema */
export const enrichEligibleCountResponseSchema: z.ZodType<EnrichEligibleCountResponse> = z.object({
  count: z.number().describe("Number of contacts eligible for enrichment"),
});

export const enrichQueueCountResponseSchema: z.ZodType<EnrichQueueCountResponse> = z.object({
  eligibleCount: z
    .number()
    .int()
    .nonnegative()
    .describe("Number of contacts eligible for enrichment"),
});

export const keepInTouchCountResponseSchema: z.ZodType<KeepInTouchCountResponse> = z.object({
  overdueCount: z
    .number()
    .int()
    .nonnegative()
    .describe("Number of contacts with an overdue keep-in-touch reminder"),
});

export const enrichQueueStatusCountsSchema: z.ZodType<EnrichQueueStatusCounts> = z.object({
  completed: z.number().describe("Number of completed queue items"),
  failed: z.number().describe("Number of failed queue items"),
  pending: z.number().describe("Number of pending queue items"),
});

export const enrichQueueInitResponseSchema: z.ZodType<EnrichQueueInitResponse> = z.object({
  totalEligible: z.number().describe("Number of contacts added to the enrichment queue"),
});

export const enrichQueueNextBatchItemSchema: z.ZodType<EnrichQueueNextBatchItem> = z.object({
  firstName: z.string().nullable().describe("Given name"),
  lastName: z.string().nullable().describe("Family name"),
  linkedinHandle: z.string().nullable().describe("LinkedIn handle to enrich"),
  personId: z.string().describe("Contact identifier"),
  queueItemId: z.string().describe("Enrichment queue item identifier"),
});

export const enrichQueueNextBatchResponseSchema: z.ZodType<EnrichQueueNextBatchResponse> = z.object(
  {
    items: z.array(enrichQueueNextBatchItemSchema).describe("Next contacts to enrich"),
  },
);

export const linkedInDataUpsertResponseSchema: z.ZodType<LinkedInDataUpsertResponse> = z.object({
  count: z.number().describe("Number of LinkedIn history rows written"),
  success: z.boolean().describe("True when the write completed"),
});

export const contactRelationshipResponseSchema: z.ZodType<ContactRelationshipResponse> = z.object({
  relationship: contactRelationshipSchema.describe("Created or updated relationship"),
});

/** POST /api/contacts/enrich-queue/init optional body. */
export const enrichQueueInitBodySchema: z.ZodType<EnrichQueueInitBody> = z
  .object({
    personId: z.string().optional().describe("Enqueue only this contact when set"),
  })
  .optional();

/** PATCH /api/contacts/enrich-queue/:id body. */
export const enrichQueuePatchBodySchema: z.ZodType<EnrichQueuePatchBody> = z.object({
  errorMessage: z.string().nullable().optional().describe("Failure message, when status is failed"),
  status: z.enum(["completed", "failed"]).describe("New queue item status"),
});

export const shareableFieldSchema = z
  .enum([
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
  ])
  .describe("Contact field that can be included in a share") satisfies z.ZodType<ShareableField>;

export const contactShareFieldPreviewSchema = z.object({
  field: shareableFieldSchema,
  preview: z.string().describe("Short preview of this field for the share picker"),
}) satisfies z.ZodType<ContactShareFieldPreview>;

export const contactSharePreviewResponseSchema = z.object({
  availableFields: z
    .array(contactShareFieldPreviewSchema)
    .describe("Fields available to include in the share"),
  contactId: z.string().describe("Contact identifier"),
  contactName: z.string().describe("Display name of the contact"),
}) satisfies z.ZodType<ContactSharePreviewResponse>;
