import { z } from "zod";
import {
  SOCIAL_IMPORT_COMMIT_BATCH_SIZE,
  VCARD_IMPORT_COMMIT_BATCH_SIZE,
} from "#constants/import.js";
import { nullableDateTimeSchema } from "#entities/_shared.js";
import { contactAddressTypeSchema } from "#entities/address.js";
import { contactSchema } from "#entities/contact.js";
import { importantDateTypeSchema } from "#entities/important-date.js";
import { channelTypeSchema } from "#primitives/index.js";

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
});

export const scrapedEducationEntrySchema = z.object({
  degree: z.string().optional(),
  description: z.string().optional(),
  endDate: z.string().optional(),
  schoolLinkedinId: z.string().optional(),
  schoolLogoUrl: z.string().optional(),
  schoolName: z.string(),
  startDate: z.string().optional(),
});

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
});

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
});

/** POST /api/contacts/:id/linkedin-data body. */
export const linkedInDataRequestSchema = z.object({
  workHistory: z.array(scrapedWorkHistoryEntrySchema).optional(),
});

export const redirectResponseSchema = z.object({
  contact: contactSchema,
  existed: z.boolean(),
});

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
});

export const linkedInParseResponseSchema = z.object({
  contacts: z.array(linkedInPreparedContactSchema),
  invalidCount: z.number(),
  totalCount: z.number(),
  validCount: z.number(),
});

export const linkedInImportCommitRequestSchema = z.object({
  contacts: z.array(linkedInPreparedContactSchema).max(SOCIAL_IMPORT_COMMIT_BATCH_SIZE),
});

export const linkedInImportCommitResponseSchema = z.object({
  importedCount: z.number(),
  skippedCount: z.number(),
  updatedCount: z.number(),
});

export const instagramImportStrategySchema = z.enum([
  "close_friends",
  "following",
  "followers",
  "following_and_followers",
  "mutual_following",
]);

export const instagramImportSourceSchema = z.enum(["following", "followers", "close_friends"]);

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
});

export const instagramParseResponseSchema = z.object({
  contacts: z.array(instagramPreparedContactSchema),
  invalidCount: z.number(),
  totalCount: z.number(),
  validCount: z.number(),
});

export const instagramImportCommitRequestSchema = z.object({
  contacts: z.array(instagramPreparedContactSchema).max(SOCIAL_IMPORT_COMMIT_BATCH_SIZE),
});

export const instagramImportCommitResponseSchema = z.object({
  importedCount: z.number(),
  skippedCount: z.number(),
  updatedCount: z.number(),
});

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
});

export const vcardParseResponseSchema = z.object({
  contacts: z.array(vcardPreparedContactSchema),
  invalidCount: z.number(),
  totalCount: z.number(),
  validCount: z.number(),
});

export const vcardImportCommitRequestSchema = z.object({
  contacts: z.array(vcardPreparedContactSchema).max(VCARD_IMPORT_COMMIT_BATCH_SIZE),
});

export const vcardImportCommitResponseSchema = z.object({
  importedCount: z.number(),
  skippedCount: z.number(),
});

export type ScrapedWorkHistoryEntry = z.infer<typeof scrapedWorkHistoryEntrySchema>;
export type ScrapedEducationEntry = z.infer<typeof scrapedEducationEntrySchema>;
export type RedirectRequest = z.infer<typeof redirectRequestSchema>;
export type EnrichContactRequest = z.infer<typeof enrichContactRequestSchema>;
export type LinkedInDataRequest = z.infer<typeof linkedInDataRequestSchema>;
export type RedirectResponse = z.infer<typeof redirectResponseSchema>;
export type LinkedInPreparedContact = z.infer<typeof linkedInPreparedContactSchema>;
export type LinkedInParseResponse = z.infer<typeof linkedInParseResponseSchema>;
export type LinkedInImportCommitRequest = z.infer<typeof linkedInImportCommitRequestSchema>;
export type LinkedInImportCommitResponse = z.infer<typeof linkedInImportCommitResponseSchema>;
export type InstagramImportStrategy = z.infer<typeof instagramImportStrategySchema>;
export type InstagramImportSource = z.infer<typeof instagramImportSourceSchema>;
export type InstagramPreparedContact = z.infer<typeof instagramPreparedContactSchema>;
export type InstagramParseResponse = z.infer<typeof instagramParseResponseSchema>;
export type InstagramImportCommitRequest = z.infer<typeof instagramImportCommitRequestSchema>;
export type InstagramImportCommitResponse = z.infer<typeof instagramImportCommitResponseSchema>;
export type VCardPreparedContact = z.infer<typeof vcardPreparedContactSchema>;
export type VCardParseResponse = z.infer<typeof vcardParseResponseSchema>;
export type VCardImportCommitRequest = z.infer<typeof vcardImportCommitRequestSchema>;
export type VCardImportCommitResponse = z.infer<typeof vcardImportCommitResponseSchema>;
