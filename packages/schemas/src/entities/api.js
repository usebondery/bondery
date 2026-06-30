import { z } from "zod";
import { AVATAR_UPLOAD, CONTACT_FIELD_MAX_LENGTHS } from "../constants/index.js";
import { shareableFieldSchema } from "./contact.js";
import { shareContactEmailSchema } from "./channels.js";
export const apiErrorResponseSchema = z.object({
    error: z.string(),
    description: z.string().optional(),
});
export const apiSuccessResponseSchema = z.object({
    success: z.literal(true),
    message: z.string().optional(),
});
export const photoUploadResponseSchema = z.object({
    success: z.boolean(),
    avatarUrl: z.string().optional(),
    error: z.string().optional(),
});
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
    personId: z.string(),
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
