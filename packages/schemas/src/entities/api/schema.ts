import { z } from "zod";
import { AVATAR_UPLOAD, CONTACT_FIELD_MAX_LENGTHS } from "#constants/index.js";
import { contactIdSchema } from "#contact-id/index.js";
import { shareContactEmailSchema } from "../channels/schema.js";
import { shareableFieldSchema } from "../contact/schema.js";
import type {
  ApiSuccessResponse,
  AvatarQuality,
  AvatarSize,
  AvatarTransformOptions,
  AvatarUploadConfig,
  FeedbackFormInput,
  ImageValidationResult,
  InputMaxLengths,
  IntegrationProvider,
  PhotoUploadResponse,
  ShareContactRequest,
} from "./types.js";

export const apiSuccessResponseSchema = z.object({
  message: z.string().optional().describe("Human-readable result message"),
  success: z.boolean().describe("True when the operation completed"),
}) satisfies z.ZodType<ApiSuccessResponse>;

export const photoUploadResponseSchema = z.object({
  avatarUrl: z.string().nullable().optional().describe("Avatar image URL after the upload"),
  error: z.string().optional().describe("Failure message, when success is false"),
  success: z.boolean().describe("True when the upload completed"),
}) satisfies z.ZodType<PhotoUploadResponse>;

export const imageValidationResultSchema = z.object({
  error: z.string().optional().describe("Failure message, when the image is not valid"),
  isValid: z.boolean().describe("True when the image passes validation"),
}) satisfies z.ZodType<ImageValidationResult>;

export const avatarQualitySchema = z
  .enum(["low", "medium", "high"])
  .describe("Image quality for contact avatars") satisfies z.ZodType<AvatarQuality>;

export const avatarSizeSchema: z.ZodType<AvatarSize> = z
  .enum(["small", "medium", "large"])
  .describe("Rendered avatar size. Use `small` for dense lists and `large` for detail views.");

export const avatarTransformOptionsSchema = z.object({
  quality: avatarQualitySchema.optional().describe("Image quality for contact avatars"),
  size: avatarSizeSchema.optional(),
}) satisfies z.ZodType<AvatarTransformOptions>;

export const shareContactRequestSchema = z.object({
  message: shareContactEmailSchema.shape.message,
  personId: contactIdSchema.describe("Contact identifier to share"),
  recipientEmails: shareContactEmailSchema.shape.recipients,
  selectedFields: z.array(shareableFieldSchema).describe("Contact fields to include in the share"),
  sendCopy: z.boolean().default(true).describe("True to send a copy to the account owner"),
}) satisfies z.ZodType<ShareContactRequest>;

export const feedbackFormSchema = z.object({
  generalFeedback: z.string().describe("Free-text product feedback"),
  npsReason: z.string().describe("Reason for the NPS score"),
  npsScore: z.number().min(0).max(10).optional().describe("Optional 0-10 satisfaction score"),
}) satisfies z.ZodType<FeedbackFormInput>;

/** Agent-reported defect. Structured so we can triage without a human retype. */
export const agentFeedbackRequestSchema = z.object({
  actual: z.string().max(2000).describe("What the tool returned"),
  expected: z.string().max(2000).describe("What you expected the tool to return"),
  generalFeedback: z.string().max(4000).optional().describe("Anything else the team should know"),
  kind: z
    .enum(["bug", "friction", "feature_request"])
    .describe(
      "bug = wrong result or crash; friction = confusing argument or description; feature_request = missing tool",
    ),
  npsScore: z.number().min(0).max(10).optional().describe("Optional 0-10 satisfaction score"),
  requestId: z
    .string()
    .max(200)
    .optional()
    .describe("The request_id from the error response, when this report is about a failure"),
  toolName: z.string().max(100).describe("The tool that misbehaved"),
});

export const inputMaxLengthsSchema = z.object({
  dateName: z.number(),
  description: z.number(),
  firstName: z.number(),
  headline: z.number(),
  lastName: z.number(),
  location: z.number(),
  middleName: z.number(),
}) satisfies z.ZodType<InputMaxLengths>;

export const avatarUploadConfigSchema = z.object({
  allowedMimeTypes: z.array(z.string()),
  maxFileSize: z.number(),
  maxFileSizeMB: z.number(),
}) satisfies z.ZodType<AvatarUploadConfig>;

export const integrationProviderSchema = z.object({
  active: z.boolean(),
  backgroundColor: z.string(),
  displayName: z.string(),
  icon: z.string(),
  iconColor: z.string(),
  provider: z.string(),
  providerKey: z.string(),
}) satisfies z.ZodType<IntegrationProvider>;

export const defaultInputMaxLengths = inputMaxLengthsSchema.parse({
  dateName: CONTACT_FIELD_MAX_LENGTHS.dateName,
  description: CONTACT_FIELD_MAX_LENGTHS.description,
  firstName: CONTACT_FIELD_MAX_LENGTHS.firstName,
  headline: CONTACT_FIELD_MAX_LENGTHS.headline,
  lastName: CONTACT_FIELD_MAX_LENGTHS.lastName,
  location: CONTACT_FIELD_MAX_LENGTHS.location,
  middleName: CONTACT_FIELD_MAX_LENGTHS.middleName,
});

export const defaultAvatarUploadConfig = avatarUploadConfigSchema.parse({
  allowedMimeTypes: [...AVATAR_UPLOAD.allowedMimeTypes],
  maxFileSize: AVATAR_UPLOAD.maxFileSizeBytes,
  maxFileSizeMB: AVATAR_UPLOAD.maxFileSizeMB,
});
