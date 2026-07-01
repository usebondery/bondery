import { z } from "zod";
import { contactIdSchema } from "#contact-id.js";
import { AVATAR_UPLOAD, CONTACT_FIELD_MAX_LENGTHS } from "#constants/index.js";
import { shareableFieldSchema } from "#entities/contact.js";
import { shareContactEmailSchema } from "#entities/channels.js";
import {
  EXAMPLE_API_SUCCESS_RESPONSE,
  EXAMPLE_PHOTO_UPLOAD_RESPONSE,
} from "#openapi/fixtures/responses.js";

export const apiErrorResponseSchema = z.object({
  error: z.string(),
  description: z.string().optional(),
  details: z.string().optional(),
});

export const apiSuccessResponseSchema = z
  .object({
    success: z.boolean(),
    message: z.string().optional(),
  })
  .meta({ example: EXAMPLE_API_SUCCESS_RESPONSE });

export const photoUploadResponseSchema = z
  .object({
    success: z.boolean(),
    avatarUrl: z.string().nullable().optional(),
    error: z.string().optional(),
  })
  .meta({ example: EXAMPLE_PHOTO_UPLOAD_RESPONSE });

export const imageValidationResultSchema = z.object({
  isValid: z.boolean(),
  error: z.string().optional(),
});

export const avatarQualitySchema = z.enum(["low", "medium", "high"]);
export const avatarSizeSchema = z.enum(["small", "medium", "large"]);

export const avatarTransformOptionsSchema = z.object({
  quality: avatarQualitySchema.optional(),
  size: avatarSizeSchema.optional(),
});

export const shareContactRequestSchema = z.object({
  personId: contactIdSchema,
  recipientEmails: shareContactEmailSchema.shape.recipients,
  message: shareContactEmailSchema.shape.message,
  sendCopy: z.boolean(),
  selectedFields: z.array(shareableFieldSchema),
});

export const feedbackFormSchema = z.object({
  npsScore: z.number().min(0).max(10),
  npsReason: z.string(),
  generalFeedback: z.string(),
});

export const inputMaxLengthsSchema = z.object({
  firstName: z.number(),
  middleName: z.number(),
  lastName: z.number(),
  headline: z.number(),
  location: z.number(),
  description: z.number(),
  dateName: z.number(),
});

export const avatarUploadConfigSchema = z.object({
  allowedMimeTypes: z.array(z.string()),
  maxFileSize: z.number(),
  maxFileSizeMB: z.number(),
});

export const integrationProviderSchema = z.object({
  provider: z.string(),
  providerKey: z.string(),
  displayName: z.string(),
  iconColor: z.string(),
  backgroundColor: z.string(),
  icon: z.string(),
  active: z.boolean(),
});

export const defaultInputMaxLengths = inputMaxLengthsSchema.parse({
  firstName: CONTACT_FIELD_MAX_LENGTHS.firstName,
  middleName: CONTACT_FIELD_MAX_LENGTHS.middleName,
  lastName: CONTACT_FIELD_MAX_LENGTHS.lastName,
  headline: CONTACT_FIELD_MAX_LENGTHS.headline,
  location: CONTACT_FIELD_MAX_LENGTHS.location,
  description: CONTACT_FIELD_MAX_LENGTHS.description,
  dateName: CONTACT_FIELD_MAX_LENGTHS.dateName,
});

export const defaultAvatarUploadConfig = avatarUploadConfigSchema.parse({
  allowedMimeTypes: [...AVATAR_UPLOAD.allowedMimeTypes],
  maxFileSize: AVATAR_UPLOAD.maxFileSizeBytes,
  maxFileSizeMB: AVATAR_UPLOAD.maxFileSizeMB,
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
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
