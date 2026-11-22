import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  agentFeedbackRequestSchema,
  apiSuccessResponseSchema,
  avatarQualitySchema,
  avatarSizeSchema,
  avatarTransformOptionsSchema,
  avatarUploadConfigSchema,
  feedbackFormSchema,
  imageValidationResultSchema,
  inputMaxLengthsSchema,
  integrationProviderSchema,
  photoUploadResponseSchema,
  shareContactRequestSchema,
} from "./schema.js";
import type {
  AgentFeedbackRequest,
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

export type _ApiSuccessResponse = Assert<
  IsEqual<ApiSuccessResponse, z.infer<typeof apiSuccessResponseSchema>>
>;
export type _PhotoUploadResponse = Assert<
  IsEqual<PhotoUploadResponse, z.infer<typeof photoUploadResponseSchema>>
>;
export type _ImageValidationResult = Assert<
  IsEqual<ImageValidationResult, z.infer<typeof imageValidationResultSchema>>
>;
export type _AvatarQuality = Assert<IsEqual<AvatarQuality, z.infer<typeof avatarQualitySchema>>>;
export type _AvatarSize = Assert<IsEqual<AvatarSize, z.infer<typeof avatarSizeSchema>>>;
export type _AvatarTransformOptions = Assert<
  IsEqual<AvatarTransformOptions, z.infer<typeof avatarTransformOptionsSchema>>
>;
export type _ShareContactRequest = Assert<
  IsEqual<ShareContactRequest, z.infer<typeof shareContactRequestSchema>>
>;
export type _FeedbackFormInput = Assert<
  IsEqual<FeedbackFormInput, z.infer<typeof feedbackFormSchema>>
>;
export type _AgentFeedbackRequest = Assert<
  IsEqual<AgentFeedbackRequest, z.infer<typeof agentFeedbackRequestSchema>>
>;
export type _InputMaxLengths = Assert<
  IsEqual<InputMaxLengths, z.infer<typeof inputMaxLengthsSchema>>
>;
export type _AvatarUploadConfig = Assert<
  IsEqual<AvatarUploadConfig, z.infer<typeof avatarUploadConfigSchema>>
>;
export type _IntegrationProvider = Assert<
  IsEqual<IntegrationProvider, z.infer<typeof integrationProviderSchema>>
>;
