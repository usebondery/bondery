import { z } from "zod";
import { CONTACT_FIELD_MAX_LENGTHS } from "#constants/index.js";
import { contactIdSchema } from "#contact-id/schema.js";
import {
  entityAuditSchema,
  entityIdentitySchema,
  makeCollectionResponseSchema,
  messageResponseSchema,
  nullableDateTimeSchema,
} from "../_shared/schema.js";
import { contactAddressReadSchema } from "../address/schema.js";
import { emailEntryEntitySchema, phoneEntryEntitySchema } from "../channels/schema.js";
import { importantDateSchema } from "../important-date/schema.js";
import type {
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
  ContactWritableFields,
  CreateContactBody,
  CreateContactFromFullNameInput,
  CreateContactInput,
  CreateContactRelationshipInput,
  CreateContactResponse,
  DeleteContactResponse,
  PersonPreview,
  RelationshipType,
  UpdateContactIdentityInput,
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
  notes: z
    .string()
    .max(CONTACT_FIELD_MAX_LENGTHS.notesHtml, {
      error: `Notes must be at most ${CONTACT_FIELD_MAX_LENGTHS.notesHtml} characters`,
    })
    .nullable()
    .optional()
    .describe("Free-text notes"),
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

export const deleteContactResponseSchema =
  messageResponseSchema satisfies z.ZodType<DeleteContactResponse>;

export const bySocialLookupResponseSchema: z.ZodType<BySocialLookupResponse> = z.object({
  contact: contactPreviewSchema.optional().describe("Matching contact, when one exists"),
  exists: z.boolean().describe("True when a contact already has this social handle"),
});

export const createContactRelationshipInputSchema = z.object({
  relatedPersonId: contactIdSchema.describe("Identifier of the related contact"),
  relationshipType: relationshipTypeSchema,
}) satisfies z.ZodType<CreateContactRelationshipInput>;

export const updateContactRelationshipInputSchema = createContactRelationshipInputSchema;

export const contactRelationshipsResponseSchema = makeCollectionResponseSchema(
  "relationships",
  contactRelationshipWithPeopleSchema,
) satisfies z.ZodType<ContactRelationshipsResponse>;

export const contactRelationshipResponseSchema: z.ZodType<ContactRelationshipResponse> = z.object({
  relationship: contactRelationshipSchema.describe("Created or updated relationship"),
});
