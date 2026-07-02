import { z } from "zod";
import { contactAddressTypeSchema } from "#entities/address.js";
import { nullableDateTimeSchema } from "#entities/_shared.js";
import { channelTypeSchema } from "#primitives/index.js";
import { importantDateTypeSchema } from "#entities/important-date.js";
import {
  EXAMPLE_INSTAGRAM_IMPORT_COMMIT_RESPONSE,
  EXAMPLE_INSTAGRAM_PARSE_RESPONSE,
  EXAMPLE_LINKEDIN_IMPORT_COMMIT_RESPONSE,
  EXAMPLE_LINKEDIN_PARSE_RESPONSE,
  EXAMPLE_REDIRECT_RESPONSE,
  EXAMPLE_VCARD_IMPORT_COMMIT_RESPONSE,
  EXAMPLE_VCARD_PARSE_RESPONSE,
} from "#openapi/fixtures/schema-examples.js";
import {
  EXAMPLE_ENRICH_CONTACT_REQUEST,
  EXAMPLE_EXTENSION_REDIRECT_REQUEST,
  EXAMPLE_INSTAGRAM_IMPORT_COMMIT_REQUEST,
  EXAMPLE_LINKEDIN_DATA_REQUEST,
  EXAMPLE_LINKEDIN_IMPORT_COMMIT_REQUEST,
  EXAMPLE_VCARD_IMPORT_COMMIT_REQUEST,
} from "#openapi/fixtures/requests.js";

export const scrapedWorkHistoryEntrySchema = z.object({
  title: z.string().optional(),
  companyName: z.string(),
  companyLinkedinId: z.string().optional(),
  companyLogoUrl: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  employmentType: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
});

export const scrapedEducationEntrySchema = z.object({
  schoolName: z.string(),
  schoolLinkedinId: z.string().optional(),
  schoolLogoUrl: z.string().optional(),
  degree: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const redirectRequestSchema = z.object({
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  facebook: z.string().optional(),
  firstName: z.string().optional(),
  middleName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().optional(),
  headline: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  workHistory: z.array(scrapedWorkHistoryEntrySchema).optional(),
  educationHistory: z.array(scrapedEducationEntrySchema).optional(),
  linkedinBio: z.string().optional(),
}).meta({ example: EXAMPLE_EXTENSION_REDIRECT_REQUEST });

export const enrichContactRequestSchema = z.object({
  firstName: z.string().optional(),
  middleName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  profileImageUrl: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  linkedinBio: z.string().nullable().optional(),
  workHistory: z.array(scrapedWorkHistoryEntrySchema).optional(),
  educationHistory: z.array(scrapedEducationEntrySchema).optional(),
}).meta({ example: EXAMPLE_ENRICH_CONTACT_REQUEST });

/** POST /api/contacts/:id/linkedin-data body. */
export const linkedInDataRequestSchema = z.object({
  workHistory: z.array(scrapedWorkHistoryEntrySchema).optional(),
}).meta({ example: EXAMPLE_LINKEDIN_DATA_REQUEST });

export const redirectResponseSchema = z
  .object({
    contactId: z.string(),
    existed: z.boolean(),
    firstName: z.string().optional(),
    lastName: z.string().nullable().optional(),
    avatar: z.string().nullable().optional(),
  })
  .meta({ example: EXAMPLE_REDIRECT_RESPONSE });

export const linkedInPreparedContactSchema = z.object({
  tempId: z.string(),
  firstName: z.string(),
  middleName: z.string().nullable(),
  lastName: z.string(),
  linkedinUrl: z.string(),
  linkedinUsername: z.string(),
  alreadyExists: z.boolean(),
  email: z.string().nullable(),
  company: z.string().nullable(),
  position: z.string().nullable(),
  connectedAt: nullableDateTimeSchema,
  connectedOnRaw: z.string().nullable(),
  isValid: z.boolean(),
  issues: z.array(z.string()),
});

export const linkedInParseResponseSchema = z
  .object({
    contacts: z.array(linkedInPreparedContactSchema),
    totalCount: z.number(),
    validCount: z.number(),
    invalidCount: z.number(),
  })
  .meta({ example: EXAMPLE_LINKEDIN_PARSE_RESPONSE });

export const linkedInImportCommitRequestSchema = z.object({
  contacts: z.array(linkedInPreparedContactSchema),
}).meta({ example: EXAMPLE_LINKEDIN_IMPORT_COMMIT_REQUEST });

export const linkedInImportCommitResponseSchema = z
  .object({
    importedCount: z.number(),
    updatedCount: z.number(),
    skippedCount: z.number(),
  })
  .meta({ example: EXAMPLE_LINKEDIN_IMPORT_COMMIT_RESPONSE });

export const instagramImportStrategySchema = z.enum([
  "close_friends",
  "following",
  "followers",
  "following_and_followers",
  "mutual_following",
]);

export const instagramImportSourceSchema = z.enum(["following", "followers", "close_friends"]);

export const instagramPreparedContactSchema = z.object({
  tempId: z.string(),
  firstName: z.string(),
  middleName: z.string().nullable(),
  lastName: z.string(),
  instagramUrl: z.string(),
  instagramUsername: z.string(),
  alreadyExists: z.boolean(),
  likelyPerson: z.boolean(),
  connectedAt: nullableDateTimeSchema,
  connectedOnRaw: z.number().nullable(),
  sources: z.array(instagramImportSourceSchema),
  isValid: z.boolean(),
  issues: z.array(z.string()),
});

export const instagramParseResponseSchema = z
  .object({
    contacts: z.array(instagramPreparedContactSchema),
    totalCount: z.number(),
    validCount: z.number(),
    invalidCount: z.number(),
  })
  .meta({ example: EXAMPLE_INSTAGRAM_PARSE_RESPONSE });

export const instagramImportCommitRequestSchema = z.object({
  contacts: z.array(instagramPreparedContactSchema),
}).meta({ example: EXAMPLE_INSTAGRAM_IMPORT_COMMIT_REQUEST });

export const instagramImportCommitResponseSchema = z
  .object({
    importedCount: z.number(),
    updatedCount: z.number(),
    skippedCount: z.number(),
  })
  .meta({ example: EXAMPLE_INSTAGRAM_IMPORT_COMMIT_RESPONSE });

const vcardPreparedPhoneSchema = z.object({
  prefix: z.string(),
  value: z.string(),
  type: channelTypeSchema,
  preferred: z.boolean(),
});

const vcardPreparedEmailSchema = z.object({
  value: z.string(),
  type: channelTypeSchema,
  preferred: z.boolean(),
});

const vcardPreparedAddressSchema = z.object({
  value: z.string(),
  type: contactAddressTypeSchema,
  preferred: z.boolean(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  addressCity: z.string().nullable(),
  addressPostalCode: z.string().nullable(),
  addressState: z.string().nullable(),
  addressStateCode: z.string().nullable(),
  addressCountry: z.string().nullable(),
  addressCountryCode: z.string().nullable(),
  addressFormatted: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  geocodeSource: z.literal("mapy.com").nullable(),
  validity: z.enum(["valid", "unverifiable", "invalid"]),
  timezone: z.string().nullable(),
});

const vcardPreparedImportantDateSchema = z.object({
  type: importantDateTypeSchema,
  date: z.string(),
  note: z.string().nullable(),
});

export const vcardPreparedContactSchema = z.object({
  tempId: z.string(),
  firstName: z.string(),
  middleName: z.string().nullable(),
  lastName: z.string(),
  headline: z.string().nullable(),
  phones: z.array(vcardPreparedPhoneSchema),
  emails: z.array(vcardPreparedEmailSchema),
  addresses: z.array(vcardPreparedAddressSchema),
  linkedin: z.string().nullable(),
  instagram: z.string().nullable(),
  whatsapp: z.string().nullable(),
  facebook: z.string().nullable(),
  signal: z.string().nullable(),
  website: z.string().nullable(),
  avatarUri: z.string().nullable(),
  importantDates: z.array(vcardPreparedImportantDateSchema).nullable(),
  isValid: z.boolean(),
  issues: z.array(z.string()),
});

export const vcardParseResponseSchema = z
  .object({
    contacts: z.array(vcardPreparedContactSchema),
    totalCount: z.number(),
    validCount: z.number(),
    invalidCount: z.number(),
  })
  .meta({ example: EXAMPLE_VCARD_PARSE_RESPONSE });

export const vcardImportCommitRequestSchema = z.object({
  contacts: z.array(vcardPreparedContactSchema),
}).meta({ example: EXAMPLE_VCARD_IMPORT_COMMIT_REQUEST });

export const vcardImportCommitResponseSchema = z
  .object({
    importedCount: z.number(),
    skippedCount: z.number(),
  })
  .meta({ example: EXAMPLE_VCARD_IMPORT_COMMIT_RESPONSE });

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
