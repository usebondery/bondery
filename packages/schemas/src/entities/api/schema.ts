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
  message: z.string().optional(),
  success: z.boolean(),
}) satisfies z.ZodType<ApiSuccessResponse>;

export const photoUploadResponseSchema = z.object({
  avatarUrl: z.string().nullable().optional(),
  error: z.string().optional(),
  success: z.boolean(),
}) satisfies z.ZodType<PhotoUploadResponse>;

export const imageValidationResultSchema = z.object({
  error: z.string().optional(),
  isValid: z.boolean(),
}) satisfies z.ZodType<ImageValidationResult>;

export const avatarQualitySchema = z.enum([
  "low",
  "medium",
  "high",
]) satisfies z.ZodType<AvatarQuality>;

export const avatarSizeSchema = z.enum([
  "small",
  "medium",
  "large",
]) satisfies z.ZodType<AvatarSize>;

export const avatarTransformOptionsSchema = z.object({
  quality: avatarQualitySchema.optional(),
  size: avatarSizeSchema.optional(),
}) satisfies z.ZodType<AvatarTransformOptions>;

export const shareContactRequestSchema = z.object({
  message: shareContactEmailSchema.shape.message,
  personId: contactIdSchema,
  recipientEmails: shareContactEmailSchema.shape.recipients,
  selectedFields: z.array(shareableFieldSchema),
  sendCopy: z.boolean(),
}) satisfies z.ZodType<ShareContactRequest>;

export const feedbackFormSchema = z.object({
  generalFeedback: z.string(),
  npsReason: z.string(),
  npsScore: z.number().min(0).max(10),
}) satisfies z.ZodType<FeedbackFormInput>;

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
