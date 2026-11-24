import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  enrichContactRequestSchema,
  instagramImportCommitRequestSchema,
  instagramImportCommitResponseSchema,
  instagramImportSourceSchema,
  instagramImportStrategySchema,
  instagramParseResponseSchema,
  instagramPreparedContactSchema,
  linkedInDataRequestSchema,
  linkedInImportCommitRequestSchema,
  linkedInImportCommitResponseSchema,
  linkedInParseResponseSchema,
  linkedInPreparedContactSchema,
  redirectRequestSchema,
  redirectResponseSchema,
  scrapedEducationEntrySchema,
  scrapedWorkHistoryEntrySchema,
  vcardImportCommitRequestSchema,
  vcardImportCommitResponseSchema,
  vcardParseResponseSchema,
  vcardPreparedContactSchema,
} from "./schema.js";
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

export type _ScrapedWorkHistoryEntry = Assert<
  IsEqual<ScrapedWorkHistoryEntry, z.infer<typeof scrapedWorkHistoryEntrySchema>>
>;
export type _ScrapedEducationEntry = Assert<
  IsEqual<ScrapedEducationEntry, z.infer<typeof scrapedEducationEntrySchema>>
>;
export type _RedirectRequest = Assert<
  IsEqual<RedirectRequest, z.infer<typeof redirectRequestSchema>>
>;
export type _EnrichContactRequest = Assert<
  IsEqual<EnrichContactRequest, z.infer<typeof enrichContactRequestSchema>>
>;
export type _LinkedInDataRequest = Assert<
  IsEqual<LinkedInDataRequest, z.infer<typeof linkedInDataRequestSchema>>
>;
export type _RedirectResponse = Assert<
  IsEqual<RedirectResponse, z.infer<typeof redirectResponseSchema>>
>;
export type _LinkedInPreparedContact = Assert<
  IsEqual<LinkedInPreparedContact, z.infer<typeof linkedInPreparedContactSchema>>
>;
export type _LinkedInParseResponse = Assert<
  IsEqual<LinkedInParseResponse, z.infer<typeof linkedInParseResponseSchema>>
>;
export type _LinkedInImportCommitRequest = Assert<
  IsEqual<LinkedInImportCommitRequest, z.infer<typeof linkedInImportCommitRequestSchema>>
>;
export type _LinkedInImportCommitResponse = Assert<
  IsEqual<LinkedInImportCommitResponse, z.infer<typeof linkedInImportCommitResponseSchema>>
>;
export type _InstagramImportStrategy = Assert<
  IsEqual<InstagramImportStrategy, z.infer<typeof instagramImportStrategySchema>>
>;
export type _InstagramImportSource = Assert<
  IsEqual<InstagramImportSource, z.infer<typeof instagramImportSourceSchema>>
>;
export type _InstagramPreparedContact = Assert<
  IsEqual<InstagramPreparedContact, z.infer<typeof instagramPreparedContactSchema>>
>;
export type _InstagramParseResponse = Assert<
  IsEqual<InstagramParseResponse, z.infer<typeof instagramParseResponseSchema>>
>;
export type _InstagramImportCommitRequest = Assert<
  IsEqual<InstagramImportCommitRequest, z.infer<typeof instagramImportCommitRequestSchema>>
>;
export type _InstagramImportCommitResponse = Assert<
  IsEqual<InstagramImportCommitResponse, z.infer<typeof instagramImportCommitResponseSchema>>
>;
export type _VCardPreparedContact = Assert<
  IsEqual<VCardPreparedContact, z.infer<typeof vcardPreparedContactSchema>>
>;
export type _VCardParseResponse = Assert<
  IsEqual<VCardParseResponse, z.infer<typeof vcardParseResponseSchema>>
>;
export type _VCardImportCommitRequest = Assert<
  IsEqual<VCardImportCommitRequest, z.infer<typeof vcardImportCommitRequestSchema>>
>;
export type _VCardImportCommitResponse = Assert<
  IsEqual<VCardImportCommitResponse, z.infer<typeof vcardImportCommitResponseSchema>>
>;
