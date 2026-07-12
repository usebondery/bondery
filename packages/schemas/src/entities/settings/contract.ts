import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  authUserSchema,
  colorSchemePreferenceSchema,
  groupSortOrderPreferenceSchema,
  importFollowupPlatformSchema,
  importFollowupStatusSchema,
  swipeActionPreferenceSchema,
  tagSortOrderPreferenceSchema,
  timeFormatPreferenceSchema,
  updateAccountInputSchema,
  updateImportFollowupBodySchema,
  updateSettingsBodySchema,
  updateUserSettingsInputSchema,
  userAccountResponseSchema,
  userIdentitySchema,
  userSettingsResponseSchema,
  userSettingsSchema,
} from "./schema.js";
import type {
  AuthUser,
  ColorSchemePreference,
  GroupSortOrderPreference,
  ImportFollowupPlatform,
  ImportFollowupStatus,
  SwipeActionPreference,
  TagSortOrderPreference,
  TimeFormatPreference,
  UpdateAccountInput,
  UpdateImportFollowupBody,
  UpdateSettingsBody,
  UpdateUserSettingsInput,
  UserAccountResponse,
  UserIdentity,
  UserSettings,
  UserSettingsResponse,
} from "./types.js";

type _ColorSchemePreference = Assert<
  IsEqual<ColorSchemePreference, z.infer<typeof colorSchemePreferenceSchema>>
>;
type _TimeFormatPreference = Assert<
  IsEqual<TimeFormatPreference, z.infer<typeof timeFormatPreferenceSchema>>
>;
type _SwipeActionPreference = Assert<
  IsEqual<SwipeActionPreference, z.infer<typeof swipeActionPreferenceSchema>>
>;
type _GroupSortOrderPreference = Assert<
  IsEqual<GroupSortOrderPreference, z.infer<typeof groupSortOrderPreferenceSchema>>
>;
type _TagSortOrderPreference = Assert<
  IsEqual<TagSortOrderPreference, z.infer<typeof tagSortOrderPreferenceSchema>>
>;
type _UserSettings = Assert<IsEqual<UserSettings, z.infer<typeof userSettingsSchema>>>;
type _UserIdentity = Assert<IsEqual<UserIdentity, z.infer<typeof userIdentitySchema>>>;
type _UserSettingsResponse = Assert<
  IsEqual<UserSettingsResponse, z.infer<typeof userSettingsResponseSchema>>
>;
type _UpdateUserSettingsInput = Assert<
  IsEqual<UpdateUserSettingsInput, z.infer<typeof updateUserSettingsInputSchema>>
>;
type _AuthUser = Assert<IsEqual<AuthUser, z.infer<typeof authUserSchema>>>;
type _UserAccountResponse = Assert<
  IsEqual<UserAccountResponse, z.infer<typeof userAccountResponseSchema>>
>;
type _UpdateAccountInput = Assert<
  IsEqual<UpdateAccountInput, z.infer<typeof updateAccountInputSchema>>
>;
type _ImportFollowupStatus = Assert<
  IsEqual<ImportFollowupStatus, z.infer<typeof importFollowupStatusSchema>>
>;
type _ImportFollowupPlatform = Assert<
  IsEqual<ImportFollowupPlatform, z.infer<typeof importFollowupPlatformSchema>>
>;
type _UpdateImportFollowupBody = Assert<
  IsEqual<UpdateImportFollowupBody, z.infer<typeof updateImportFollowupBodySchema>>
>;
type _UpdateSettingsBody = Assert<
  IsEqual<UpdateSettingsBody, z.infer<typeof updateSettingsBodySchema>>
>;
