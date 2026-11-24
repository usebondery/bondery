import { z } from "zod";
import {
  entityAuditSchema,
  entityIdentitySchema,
  nullableDateTimeSchema,
} from "../_shared/schema.js";
import type {
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
  WorkHistoryEntry,
} from "./types.js";

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

export const linkedInDataUpsertResponseSchema: z.ZodType<LinkedInDataUpsertResponse> = z.object({
  count: z.number().describe("Number of LinkedIn history rows written"),
  success: z.boolean().describe("True when the write completed"),
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
