import { z } from "zod";
import { AVATAR_UPLOAD, CONTACT_FIELD_MAX_LENGTHS } from "#constants/index.js";
import { contactIdSchema } from "#contact-id.js";
import { shareContactEmailSchema } from "#entities/channels.js";
import { shareableFieldSchema } from "#entities/contact.js";

export { type ApiErrorResponse, apiErrorResponseSchema } from "#errors/api-error-response.js";

export const apiSuccessResponseSchema = z.object({
  message: z.string().optional(),
  success: z.boolean(),
});

export const photoUploadResponseSchema = z.object({
  avatarUrl: z.string().nullable().optional(),
  error: z.string().optional(),
  success: z.boolean(),
});

export const imageValidationResultSchema = z.object({
  error: z.string().optional(),
  isValid: z.boolean(),
});

export const avatarQualitySchema = z.enum(["low", "medium", "high"]);
export const avatarSizeSchema = z.enum(["small", "medium", "large"]);

export const avatarTransformOptionsSchema = z.object({
  quality: avatarQualitySchema.optional(),
  size: avatarSizeSchema.optional(),
});

export const shareContactRequestSchema = z.object({
  message: shareContactEmailSchema.shape.message,
  personId: contactIdSchema,
  recipientEmails: shareContactEmailSchema.shape.recipients,
  selectedFields: z.array(shareableFieldSchema),
  sendCopy: z.boolean(),
});

export const feedbackFormSchema = z.object({
  generalFeedback: z.string(),
  npsReason: z.string(),
  npsScore: z.number().min(0).max(10),
});

export const inputMaxLengthsSchema = z.object({
  dateName: z.number(),
  description: z.number(),
  firstName: z.number(),
  headline: z.number(),
  lastName: z.number(),
  location: z.number(),
  middleName: z.number(),
});

export const avatarUploadConfigSchema = z.object({
  allowedMimeTypes: z.array(z.string()),
  maxFileSize: z.number(),
  maxFileSizeMB: z.number(),
});

export const integrationProviderSchema = z.object({
  active: z.boolean(),
  backgroundColor: z.string(),
  displayName: z.string(),
  icon: z.string(),
  iconColor: z.string(),
  provider: z.string(),
  providerKey: z.string(),
});

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

export type ApiSuccessResponse = z.infer<typeof apiSuccessResponseSchema>;
export type PhotoUploadResponse = z.infer<typeof photoUploadResponseSchema>;
export type ImageValidationResult = z.infer<typeof imageValidationResultSchema>;
export type AvatarQuality = z.infer<typeof avatarQualitySchema>;
export type AvatarSize = z.infer<typeof avatarSizeSchema>;
export type AvatarTransformOptions = z.infer<typeof avatarTransformOptionsSchema>;
export type ShareContactRequest = z.infer<typeof shareContactRequestSchema>;
export type FeedbackFormInput = z.infer<typeof feedbackFormSchema>;
export type InputMaxLengths = z.infer<typeof inputMaxLengthsSchema>;
export type AvatarUploadConfig = z.infer<typeof avatarUploadConfigSchema>;
export type IntegrationProvider = z.infer<typeof integrationProviderSchema>;
