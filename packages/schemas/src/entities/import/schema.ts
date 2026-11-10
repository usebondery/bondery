import { z } from "zod";
import {
  SOCIAL_IMPORT_COMMIT_BATCH_SIZE,
  VCARD_IMPORT_COMMIT_BATCH_SIZE,
} from "#constants/import.js";
import { channelTypeSchema } from "#primitives/channel/schema.js";
import { nullableDateTimeSchema } from "../_shared/schema.js";
import { contactAddressTypeSchema } from "../address/schema.js";
import { contactSchema } from "../contact/schema.js";
import { importantDateTypeSchema } from "../important-date/schema.js";
import type {
  EnrichContactRequest,
  InstagramImportCommitRequest,
  InstagramImportCommitResponse,
  InstagramImportSource,
  InstagramImportStrategy,
  InstagramParseResponse,
  InstagramPreparedContact,
  LinkedInDataRequest,
  LinkedInImportCommitRequest,
  LinkedInImportCommitResponse,
  LinkedInParseResponse,
  LinkedInPreparedContact,
  RedirectRequest,
  RedirectResponse,
  ScrapedEducationEntry,
  ScrapedWorkHistoryEntry,
  VCardImportCommitRequest,
  VCardImportCommitResponse,
  VCardParseResponse,
  VCardPreparedContact,
} from "./types.js";

export const scrapedWorkHistoryEntrySchema = z.object({
  companyLinkedinId: z.string().optional().describe("LinkedIn company identifier"),
  companyLogoUrl: z.string().optional().describe("Company logo image URL"),
  companyName: z.string().describe("Company name"),
  description: z.string().optional().describe("Role description"),
  employmentType: z.string().optional().describe("Employment type, such as full-time"),
  endDate: z.string().optional().describe("End date. Omit when this role is current."),
  location: z.string().optional().describe("Free-text location"),
  startDate: z.string().optional().describe("Start date"),
  title: z.string().optional().describe("Job title"),
}) satisfies z.ZodType<ScrapedWorkHistoryEntry>;

export const scrapedEducationEntrySchema = z.object({
  degree: z.string().optional().describe("Degree or program name"),
  description: z.string().optional().describe("Education description"),
  endDate: z.string().optional().describe("End date. Omit when this program is current."),
  schoolLinkedinId: z.string().optional().describe("LinkedIn school identifier"),
  schoolLogoUrl: z.string().optional().describe("School logo image URL"),
  schoolName: z.string().describe("School name"),
  startDate: z.string().optional().describe("Start date"),
}) satisfies z.ZodType<ScrapedEducationEntry>;

export const redirectRequestSchema = z.object({
  educationHistory: z
    .array(scrapedEducationEntrySchema)
    .optional()
    .describe("Education history scraped from the profile"),
  facebook: z.string().optional().describe("Facebook profile URL or handle"),
  firstName: z.string().optional().describe("Given name"),
  headline: z.string().optional().describe("Short role or description line"),
  instagram: z.string().optional().describe("Instagram profile URL or handle"),
  lastName: z.string().optional().describe("Family name"),
  linkedin: z.string().optional().describe("LinkedIn profile URL"),
  linkedinBio: z.string().optional().describe("LinkedIn about text"),
  location: z.string().optional().describe("Free-text location"),
  middleName: z.string().optional().describe("Middle name"),
  notes: z.string().optional().describe("Free-text notes"),
  profileImageUrl: z.string().optional().describe("Profile image URL to import as the avatar"),
  workHistory: z
    .array(scrapedWorkHistoryEntrySchema)
    .optional()
    .describe("Work history scraped from the profile"),
}) satisfies z.ZodType<RedirectRequest>;

export const enrichContactRequestSchema = z.object({
  educationHistory: z
    .array(scrapedEducationEntrySchema)
    .optional()
    .describe("Education history scraped from the profile"),
  firstName: z.string().optional().describe("Given name"),
  headline: z.string().nullable().optional().describe("Short role or description line"),
  lastName: z.string().nullable().optional().describe("Family name"),
  linkedinBio: z.string().nullable().optional().describe("LinkedIn about text"),
  location: z.string().nullable().optional().describe("Free-text location"),
  middleName: z.string().nullable().optional().describe("Middle name"),
  profileImageUrl: z
    .string()
    .nullable()
    .optional()
    .describe("Profile image URL to import as the avatar"),
  workHistory: z
    .array(scrapedWorkHistoryEntrySchema)
    .optional()
    .describe("Work history scraped from the profile"),
}) satisfies z.ZodType<EnrichContactRequest>;

/** POST /api/contacts/:id/linkedin-data body. */
export const linkedInDataRequestSchema = z.object({
  workHistory: z
    .array(scrapedWorkHistoryEntrySchema)
    .optional()
    .describe("Work history scraped from LinkedIn"),
}) satisfies z.ZodType<LinkedInDataRequest>;

export const redirectResponseSchema = z.object({
  contact: contactSchema.describe("Contact record"),
  existed: z.boolean().describe("True when the contact already existed"),
}) satisfies z.ZodType<RedirectResponse>;

export const linkedInPreparedContactSchema = z.object({
  alreadyExists: z.boolean().describe("True when a contact already has this LinkedIn profile"),
  company: z.string().nullable().describe("Company name from the export"),
  connectedAt: nullableDateTimeSchema.describe("Time the LinkedIn connection was made"),
  connectedOnRaw: z.string().nullable().describe("Raw connected-on value from the export"),
  email: z.string().nullable().describe("Email address from the export"),
  firstName: z.string().describe("Given name"),
  issues: z.array(z.string()).describe("Parse issues for this row"),
  isValid: z.boolean().describe("True when this row can be imported"),
  lastName: z.string().describe("Family name"),
  linkedinUrl: z.string().describe("LinkedIn profile URL"),
  linkedinUsername: z.string().describe("LinkedIn username"),
  middleName: z.string().nullable().describe("Middle name"),
  position: z.string().nullable().describe("Job title from the export"),
  tempId: z.string().describe("Temporary identifier for this import row"),
}) satisfies z.ZodType<LinkedInPreparedContact>;

export const linkedInParseResponseSchema = z.object({
  contacts: z.array(linkedInPreparedContactSchema).describe("Prepared contacts from the export"),
  invalidCount: z.number().describe("Number of rows that cannot be imported"),
  totalCount: z.number().describe("Total rows in the export"),
  validCount: z.number().describe("Number of rows that can be imported"),
}) satisfies z.ZodType<LinkedInParseResponse>;

export const linkedInImportCommitRequestSchema = z.object({
  contacts: z
    .array(linkedInPreparedContactSchema)
    .max(SOCIAL_IMPORT_COMMIT_BATCH_SIZE)
    .describe("Prepared contacts to import"),
}) satisfies z.ZodType<LinkedInImportCommitRequest>;

export const linkedInImportCommitResponseSchema = z.object({
  importedCount: z.number().describe("Number of contacts created"),
  skippedCount: z.number().describe("Number of contacts skipped"),
  updatedCount: z.number().describe("Number of existing contacts updated"),
}) satisfies z.ZodType<LinkedInImportCommitResponse>;

export const instagramImportStrategySchema = z.enum([
  "close_friends",
  "following",
  "followers",
  "following_and_followers",
  "mutual_following",
]) satisfies z.ZodType<InstagramImportStrategy>;

export const instagramImportSourceSchema = z.enum([
  "following",
  "followers",
  "close_friends",
]) satisfies z.ZodType<InstagramImportSource>;

export const instagramPreparedContactSchema = z.object({
  alreadyExists: z.boolean().describe("True when a contact already has this Instagram profile"),
  connectedAt: nullableDateTimeSchema.describe("Time the Instagram connection was made"),
  connectedOnRaw: z.number().nullable().describe("Raw connected-on timestamp from the export"),
  firstName: z.string().describe("Given name"),
  instagramUrl: z.string().describe("Instagram profile URL"),
  instagramUsername: z.string().describe("Instagram username"),
  issues: z.array(z.string()).describe("Parse issues for this row"),
  isValid: z.boolean().describe("True when this row can be imported"),
  lastName: z.string().describe("Family name"),
  likelyPerson: z.boolean().describe("True when the username looks like a person, not a brand"),
  middleName: z.string().nullable().describe("Middle name"),
  sources: z.array(instagramImportSourceSchema).describe("Export lists this profile appeared in"),
  tempId: z.string().describe("Temporary identifier for this import row"),
}) satisfies z.ZodType<InstagramPreparedContact>;

export const instagramParseResponseSchema = z.object({
  contacts: z.array(instagramPreparedContactSchema).describe("Prepared contacts from the export"),
  invalidCount: z.number().describe("Number of rows that cannot be imported"),
  totalCount: z.number().describe("Total rows in the export"),
  validCount: z.number().describe("Number of rows that can be imported"),
}) satisfies z.ZodType<InstagramParseResponse>;

export const instagramImportCommitRequestSchema = z.object({
  contacts: z
    .array(instagramPreparedContactSchema)
    .max(SOCIAL_IMPORT_COMMIT_BATCH_SIZE)
    .describe("Prepared contacts to import"),
}) satisfies z.ZodType<InstagramImportCommitRequest>;

export const instagramImportCommitResponseSchema = z.object({
  importedCount: z.number().describe("Number of contacts created"),
  skippedCount: z.number().describe("Number of contacts skipped"),
  updatedCount: z.number().describe("Number of existing contacts updated"),
}) satisfies z.ZodType<InstagramImportCommitResponse>;

const vcardPreparedPhoneSchema = z.object({
  preferred: z.boolean().describe("True when this is the contact's primary phone number"),
  prefix: z.string().describe("Country calling code, digits only"),
  type: channelTypeSchema.describe("Phone category, such as home or work"),
  value: z.string().describe("Phone number in local or international form"),
});

const vcardPreparedEmailSchema = z.object({
  preferred: z.boolean().describe("True when this is the contact's primary email address"),
  type: channelTypeSchema.describe("Email category, such as home or work"),
  value: z.string().describe("Email address"),
});

const vcardPreparedAddressSchema = z.object({
  addressCity: z.string().nullable().describe("City name"),
  addressCountry: z.string().nullable().describe("Country name"),
  addressCountryCode: z.string().nullable().describe("ISO 3166-1 alpha-2 country code"),
  addressFormatted: z.string().nullable().describe("Full address on one line"),
  addressLine1: z.string().nullable().describe("Street and house number"),
  addressLine2: z.string().nullable().describe("Second address line, such as a unit"),
  addressPostalCode: z.string().nullable().describe("Postal or ZIP code"),
  addressState: z.string().nullable().describe("State or region name"),
  addressStateCode: z.string().nullable().describe("State or region code"),
  geocodeSource: z.literal("mapy.com").nullable().describe("How the coordinates were resolved"),
  latitude: z.number().nullable().describe("Latitude in decimal degrees"),
  longitude: z.number().nullable().describe("Longitude in decimal degrees"),
  preferred: z.boolean().describe("True when this is the contact's primary address"),
  timezone: z.string().nullable().describe("IANA timezone name for this address"),
  type: contactAddressTypeSchema.describe("Address category"),
  validity: z
    .enum(["valid", "unverifiable", "invalid"])
    .describe("Whether the geocoder verified this address"),
  value: z.string().describe("Display value of the address"),
});

const vcardPreparedImportantDateSchema = z.object({
  date: z.string().describe("Date in `YYYY-MM-DD` form"),
  note: z.string().nullable().describe("Free-text note for this date"),
  type: importantDateTypeSchema.describe("Kind of important date, such as birthday or anniversary"),
});

export const vcardPreparedContactSchema = z.object({
  addresses: z.array(vcardPreparedAddressSchema).describe("Postal addresses from the vCard"),
  avatarUri: z.string().nullable().describe("Embedded avatar data URI, or null when unset"),
  emails: z.array(vcardPreparedEmailSchema).describe("Email addresses from the vCard"),
  facebook: z.string().nullable().describe("Facebook profile URL or handle"),
  firstName: z.string().describe("Given name"),
  headline: z.string().nullable().describe("Short role or description line"),
  importantDates: z
    .array(vcardPreparedImportantDateSchema)
    .nullable()
    .describe("Birthdays and other recurring dates"),
  instagram: z.string().nullable().describe("Instagram profile URL or handle"),
  issues: z.array(z.string()).describe("Parse issues for this row"),
  isValid: z.boolean().describe("True when this row can be imported"),
  lastName: z.string().describe("Family name"),
  linkedin: z.string().nullable().describe("LinkedIn profile URL"),
  middleName: z.string().nullable().describe("Middle name"),
  phones: z.array(vcardPreparedPhoneSchema).describe("Phone numbers from the vCard"),
  signal: z.string().nullable().describe("Signal username"),
  tempId: z.string().describe("Temporary identifier for this import row"),
  website: z.string().nullable().describe("Personal or company website URL"),
  whatsapp: z.string().nullable().describe("WhatsApp number"),
}) satisfies z.ZodType<VCardPreparedContact>;

export const vcardParseResponseSchema = z.object({
  contacts: z.array(vcardPreparedContactSchema).describe("Prepared contacts from the vCard file"),
  invalidCount: z.number().describe("Number of rows that cannot be imported"),
  totalCount: z.number().describe("Total rows in the file"),
  validCount: z.number().describe("Number of rows that can be imported"),
}) satisfies z.ZodType<VCardParseResponse>;

export const vcardImportCommitRequestSchema = z.object({
  contacts: z
    .array(vcardPreparedContactSchema)
    .max(VCARD_IMPORT_COMMIT_BATCH_SIZE)
    .describe("Prepared contacts to import"),
}) satisfies z.ZodType<VCardImportCommitRequest>;

export const vcardImportCommitResponseSchema = z.object({
  importedCount: z.number().describe("Number of contacts created"),
  skippedCount: z.number().describe("Number of contacts skipped"),
}) satisfies z.ZodType<VCardImportCommitResponse>;
