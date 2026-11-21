import { z } from "zod";
import { MAX_TAG_FILTER_IDS } from "#constants/index.js";
import { contactIdSchema } from "#contact-id/schema.js";
import {
  idsRequestSchema,
  makePaginatedListResponseSchema,
  messageResponseSchema,
  nullableDateTimeSchema,
} from "../_shared/schema.js";
import { contactListItemSchema, contactSelectableSchema } from "./schema.js";
import type {
  AddressPin,
  ContactSortOrder,
  ContactsFilter,
  ContactsListResponse,
  ContactsListStats,
  ContactsSelectableListResponse,
  DeleteContactsRequest,
  DeleteContactsResponse,
  MapAddressPinsResponse,
  MapPin,
  MapPinsResponse,
} from "./types.js";

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
    .max(MAX_TAG_FILTER_IDS)
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
