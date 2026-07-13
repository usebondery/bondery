import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
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

type _ApiSuccessResponse = Assert<
  IsEqual<ApiSuccessResponse, z.infer<typeof apiSuccessResponseSchema>>
>;
type _PhotoUploadResponse = Assert<
  IsEqual<PhotoUploadResponse, z.infer<typeof photoUploadResponseSchema>>
>;
type _ImageValidationResult = Assert<
  IsEqual<ImageValidationResult, z.infer<typeof imageValidationResultSchema>>
>;
type _AvatarQuality = Assert<IsEqual<AvatarQuality, z.infer<typeof avatarQualitySchema>>>;
type _AvatarSize = Assert<IsEqual<AvatarSize, z.infer<typeof avatarSizeSchema>>>;
type _AvatarTransformOptions = Assert<
  IsEqual<AvatarTransformOptions, z.infer<typeof avatarTransformOptionsSchema>>
>;
type _ShareContactRequest = Assert<
  IsEqual<ShareContactRequest, z.infer<typeof shareContactRequestSchema>>
>;
type _FeedbackFormInput = Assert<IsEqual<FeedbackFormInput, z.infer<typeof feedbackFormSchema>>>;
type _InputMaxLengths = Assert<IsEqual<InputMaxLengths, z.infer<typeof inputMaxLengthsSchema>>>;
type _AvatarUploadConfig = Assert<
  IsEqual<AvatarUploadConfig, z.infer<typeof avatarUploadConfigSchema>>
>;
type _IntegrationProvider = Assert<
  IsEqual<IntegrationProvider, z.infer<typeof integrationProviderSchema>>
>;
