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

type _ScrapedWorkHistoryEntry = Assert<
  IsEqual<ScrapedWorkHistoryEntry, z.infer<typeof scrapedWorkHistoryEntrySchema>>
>;
type _ScrapedEducationEntry = Assert<
  IsEqual<ScrapedEducationEntry, z.infer<typeof scrapedEducationEntrySchema>>
>;
type _RedirectRequest = Assert<IsEqual<RedirectRequest, z.infer<typeof redirectRequestSchema>>>;
type _EnrichContactRequest = Assert<
  IsEqual<EnrichContactRequest, z.infer<typeof enrichContactRequestSchema>>
>;
type _LinkedInDataRequest = Assert<
  IsEqual<LinkedInDataRequest, z.infer<typeof linkedInDataRequestSchema>>
>;
type _RedirectResponse = Assert<IsEqual<RedirectResponse, z.infer<typeof redirectResponseSchema>>>;
type _LinkedInPreparedContact = Assert<
  IsEqual<LinkedInPreparedContact, z.infer<typeof linkedInPreparedContactSchema>>
>;
type _LinkedInParseResponse = Assert<
  IsEqual<LinkedInParseResponse, z.infer<typeof linkedInParseResponseSchema>>
>;
type _LinkedInImportCommitRequest = Assert<
  IsEqual<LinkedInImportCommitRequest, z.infer<typeof linkedInImportCommitRequestSchema>>
>;
type _LinkedInImportCommitResponse = Assert<
  IsEqual<LinkedInImportCommitResponse, z.infer<typeof linkedInImportCommitResponseSchema>>
>;
type _InstagramImportStrategy = Assert<
  IsEqual<InstagramImportStrategy, z.infer<typeof instagramImportStrategySchema>>
>;
type _InstagramImportSource = Assert<
  IsEqual<InstagramImportSource, z.infer<typeof instagramImportSourceSchema>>
>;
type _InstagramPreparedContact = Assert<
  IsEqual<InstagramPreparedContact, z.infer<typeof instagramPreparedContactSchema>>
>;
type _InstagramParseResponse = Assert<
  IsEqual<InstagramParseResponse, z.infer<typeof instagramParseResponseSchema>>
>;
type _InstagramImportCommitRequest = Assert<
  IsEqual<InstagramImportCommitRequest, z.infer<typeof instagramImportCommitRequestSchema>>
>;
type _InstagramImportCommitResponse = Assert<
  IsEqual<InstagramImportCommitResponse, z.infer<typeof instagramImportCommitResponseSchema>>
>;
type _VCardPreparedContact = Assert<
  IsEqual<VCardPreparedContact, z.infer<typeof vcardPreparedContactSchema>>
>;
type _VCardParseResponse = Assert<
  IsEqual<VCardParseResponse, z.infer<typeof vcardParseResponseSchema>>
>;
type _VCardImportCommitRequest = Assert<
  IsEqual<VCardImportCommitRequest, z.infer<typeof vcardImportCommitRequestSchema>>
>;
type _VCardImportCommitResponse = Assert<
  IsEqual<VCardImportCommitResponse, z.infer<typeof vcardImportCommitResponseSchema>>
>;
