import { z } from "zod";
export declare const apiErrorResponseSchema: z.ZodObject<{
    error: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const apiSuccessResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<true>;
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const photoUploadResponseSchema: z.ZodObject<{
    success: z.ZodBoolean;
    avatarUrl: z.ZodOptional<z.ZodString>;
    error: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const imageValidationResultSchema: z.ZodObject<{
    isValid: z.ZodBoolean;
    error: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const avatarQualitySchema: z.ZodEnum<{
    low: "low";
    medium: "medium";
    high: "high";
}>;
export declare const avatarSizeSchema: z.ZodEnum<{
    small: "small";
    medium: "medium";
    large: "large";
}>;
export declare const avatarTransformOptionsSchema: z.ZodObject<{
    quality: z.ZodOptional<z.ZodEnum<{
        low: "low";
        medium: "medium";
        high: "high";
    }>>;
    size: z.ZodOptional<z.ZodEnum<{
        small: "small";
        medium: "medium";
        large: "large";
    }>>;
}, z.core.$strip>;
export declare const shareContactRequestSchema: z.ZodObject<{
    personId: z.ZodString;
    recipientEmails: z.ZodArray<z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>>;
    message: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<string | undefined, string>>>;
    sendCopy: z.ZodBoolean;
    selectedFields: z.ZodArray<z.ZodEnum<{
        facebook: "facebook";
        instagram: "instagram";
        name: "name";
        avatar: "avatar";
        addresses: "addresses";
        headline: "headline";
        location: "location";
        notes: "notes";
        phones: "phones";
        emails: "emails";
        linkedin: "linkedin";
        whatsapp: "whatsapp";
        website: "website";
        signal: "signal";
        importantDates: "importantDates";
    }>>;
}, z.core.$strip>;
export declare const feedbackFormSchema: z.ZodObject<{
    npsScore: z.ZodNumber;
    npsReason: z.ZodString;
    generalFeedback: z.ZodString;
}, z.core.$strip>;
export declare const inputMaxLengthsSchema: z.ZodObject<{
    firstName: z.ZodNumber;
    middleName: z.ZodNumber;
    lastName: z.ZodNumber;
    headline: z.ZodNumber;
    location: z.ZodNumber;
    description: z.ZodNumber;
    dateName: z.ZodNumber;
}, z.core.$strip>;
export declare const avatarUploadConfigSchema: z.ZodObject<{
    allowedMimeTypes: z.ZodArray<z.ZodString>;
    maxFileSize: z.ZodNumber;
    maxFileSizeMB: z.ZodNumber;
}, z.core.$strip>;
export declare const integrationProviderSchema: z.ZodObject<{
    provider: z.ZodString;
    providerKey: z.ZodString;
    displayName: z.ZodString;
    iconColor: z.ZodString;
    backgroundColor: z.ZodString;
    icon: z.ZodString;
    active: z.ZodBoolean;
}, z.core.$strip>;
export declare const defaultInputMaxLengths: {
    firstName: number;
    middleName: number;
    lastName: number;
    headline: number;
    location: number;
    description: number;
    dateName: number;
};
export declare const defaultAvatarUploadConfig: {
    allowedMimeTypes: string[];
    maxFileSize: number;
    maxFileSizeMB: number;
};
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
