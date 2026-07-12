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
  companyLinkedinId: z.string().optional(),
  companyLogoUrl: z.string().optional(),
  companyName: z.string(),
  description: z.string().optional(),
  employmentType: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  title: z.string().optional(),
}) satisfies z.ZodType<ScrapedWorkHistoryEntry>;

export const scrapedEducationEntrySchema = z.object({
  degree: z.string().optional(),
  description: z.string().optional(),
  endDate: z.string().optional(),
  schoolLinkedinId: z.string().optional(),
  schoolLogoUrl: z.string().optional(),
  schoolName: z.string(),
  startDate: z.string().optional(),
}) satisfies z.ZodType<ScrapedEducationEntry>;

export const redirectRequestSchema = z.object({
  educationHistory: z.array(scrapedEducationEntrySchema).optional(),
  facebook: z.string().optional(),
  firstName: z.string().optional(),
  headline: z.string().optional(),
  instagram: z.string().optional(),
  lastName: z.string().optional(),
  linkedin: z.string().optional(),
  linkedinBio: z.string().optional(),
  location: z.string().optional(),
  middleName: z.string().optional(),
  notes: z.string().optional(),
  profileImageUrl: z.string().optional(),
  workHistory: z.array(scrapedWorkHistoryEntrySchema).optional(),
}) satisfies z.ZodType<RedirectRequest>;

export const enrichContactRequestSchema = z.object({
  educationHistory: z.array(scrapedEducationEntrySchema).optional(),
  firstName: z.string().optional(),
  headline: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  linkedinBio: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  middleName: z.string().nullable().optional(),
  profileImageUrl: z.string().nullable().optional(),
  workHistory: z.array(scrapedWorkHistoryEntrySchema).optional(),
}) satisfies z.ZodType<EnrichContactRequest>;

/** POST /api/contacts/:id/linkedin-data body. */
export const linkedInDataRequestSchema = z.object({
  workHistory: z.array(scrapedWorkHistoryEntrySchema).optional(),
}) satisfies z.ZodType<LinkedInDataRequest>;

export const redirectResponseSchema = z.object({
  contact: contactSchema,
  existed: z.boolean(),
}) satisfies z.ZodType<RedirectResponse>;

export const linkedInPreparedContactSchema = z.object({
  alreadyExists: z.boolean(),
  company: z.string().nullable(),
  connectedAt: nullableDateTimeSchema,
  connectedOnRaw: z.string().nullable(),
  email: z.string().nullable(),
  firstName: z.string(),
  issues: z.array(z.string()),
  isValid: z.boolean(),
  lastName: z.string(),
  linkedinUrl: z.string(),
  linkedinUsername: z.string(),
  middleName: z.string().nullable(),
  position: z.string().nullable(),
  tempId: z.string(),
}) satisfies z.ZodType<LinkedInPreparedContact>;

export const linkedInParseResponseSchema = z.object({
  contacts: z.array(linkedInPreparedContactSchema),
  invalidCount: z.number(),
  totalCount: z.number(),
  validCount: z.number(),
}) satisfies z.ZodType<LinkedInParseResponse>;

export const linkedInImportCommitRequestSchema = z.object({
  contacts: z.array(linkedInPreparedContactSchema).max(SOCIAL_IMPORT_COMMIT_BATCH_SIZE),
}) satisfies z.ZodType<LinkedInImportCommitRequest>;

export const linkedInImportCommitResponseSchema = z.object({
  importedCount: z.number(),
  skippedCount: z.number(),
  updatedCount: z.number(),
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
  alreadyExists: z.boolean(),
  connectedAt: nullableDateTimeSchema,
  connectedOnRaw: z.number().nullable(),
  firstName: z.string(),
  instagramUrl: z.string(),
  instagramUsername: z.string(),
  issues: z.array(z.string()),
  isValid: z.boolean(),
  lastName: z.string(),
  likelyPerson: z.boolean(),
  middleName: z.string().nullable(),
  sources: z.array(instagramImportSourceSchema),
  tempId: z.string(),
}) satisfies z.ZodType<InstagramPreparedContact>;

export const instagramParseResponseSchema = z.object({
  contacts: z.array(instagramPreparedContactSchema),
  invalidCount: z.number(),
  totalCount: z.number(),
  validCount: z.number(),
}) satisfies z.ZodType<InstagramParseResponse>;

export const instagramImportCommitRequestSchema = z.object({
  contacts: z.array(instagramPreparedContactSchema).max(SOCIAL_IMPORT_COMMIT_BATCH_SIZE),
}) satisfies z.ZodType<InstagramImportCommitRequest>;

export const instagramImportCommitResponseSchema = z.object({
  importedCount: z.number(),
  skippedCount: z.number(),
  updatedCount: z.number(),
}) satisfies z.ZodType<InstagramImportCommitResponse>;

const vcardPreparedPhoneSchema = z.object({
  preferred: z.boolean(),
  prefix: z.string(),
  type: channelTypeSchema,
  value: z.string(),
});

const vcardPreparedEmailSchema = z.object({
  preferred: z.boolean(),
  type: channelTypeSchema,
  value: z.string(),
});

const vcardPreparedAddressSchema = z.object({
  addressCity: z.string().nullable(),
  addressCountry: z.string().nullable(),
  addressCountryCode: z.string().nullable(),
  addressFormatted: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  addressPostalCode: z.string().nullable(),
  addressState: z.string().nullable(),
  addressStateCode: z.string().nullable(),
  geocodeSource: z.literal("mapy.com").nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  preferred: z.boolean(),
  timezone: z.string().nullable(),
  type: contactAddressTypeSchema,
  validity: z.enum(["valid", "unverifiable", "invalid"]),
  value: z.string(),
});

const vcardPreparedImportantDateSchema = z.object({
  date: z.string(),
  note: z.string().nullable(),
  type: importantDateTypeSchema,
});

export const vcardPreparedContactSchema = z.object({
  addresses: z.array(vcardPreparedAddressSchema),
  avatarUri: z.string().nullable(),
  emails: z.array(vcardPreparedEmailSchema),
  facebook: z.string().nullable(),
  firstName: z.string(),
  headline: z.string().nullable(),
  importantDates: z.array(vcardPreparedImportantDateSchema).nullable(),
  instagram: z.string().nullable(),
  issues: z.array(z.string()),
  isValid: z.boolean(),
  lastName: z.string(),
  linkedin: z.string().nullable(),
  middleName: z.string().nullable(),
  phones: z.array(vcardPreparedPhoneSchema),
  signal: z.string().nullable(),
  tempId: z.string(),
  website: z.string().nullable(),
  whatsapp: z.string().nullable(),
}) satisfies z.ZodType<VCardPreparedContact>;

export const vcardParseResponseSchema = z.object({
  contacts: z.array(vcardPreparedContactSchema),
  invalidCount: z.number(),
  totalCount: z.number(),
  validCount: z.number(),
}) satisfies z.ZodType<VCardParseResponse>;

export const vcardImportCommitRequestSchema = z.object({
  contacts: z.array(vcardPreparedContactSchema).max(VCARD_IMPORT_COMMIT_BATCH_SIZE),
}) satisfies z.ZodType<VCardImportCommitRequest>;

export const vcardImportCommitResponseSchema = z.object({
  importedCount: z.number(),
  skippedCount: z.number(),
}) satisfies z.ZodType<VCardImportCommitResponse>;
