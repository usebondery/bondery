import type { z } from "zod";
import type { Assert, IsEqual } from "#internal/type-equality.js";
import type {
  authUserSchema,
  colorSchemePreferenceSchema,
  dateFormatPreferenceSchema,
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
  DateFormatPreference,
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

export type _ColorSchemePreference = Assert<
  IsEqual<ColorSchemePreference, z.infer<typeof colorSchemePreferenceSchema>>
>;
export type _TimeFormatPreference = Assert<
  IsEqual<TimeFormatPreference, z.infer<typeof timeFormatPreferenceSchema>>
>;
export type _DateFormatPreference = Assert<
  IsEqual<DateFormatPreference, z.infer<typeof dateFormatPreferenceSchema>>
>;
export type _SwipeActionPreference = Assert<
  IsEqual<SwipeActionPreference, z.infer<typeof swipeActionPreferenceSchema>>
>;
export type _GroupSortOrderPreference = Assert<
  IsEqual<GroupSortOrderPreference, z.infer<typeof groupSortOrderPreferenceSchema>>
>;
export type _TagSortOrderPreference = Assert<
  IsEqual<TagSortOrderPreference, z.infer<typeof tagSortOrderPreferenceSchema>>
>;
export type _UserSettings = Assert<IsEqual<UserSettings, z.infer<typeof userSettingsSchema>>>;
export type _UserIdentity = Assert<IsEqual<UserIdentity, z.infer<typeof userIdentitySchema>>>;
export type _UserSettingsResponse = Assert<
  IsEqual<UserSettingsResponse, z.infer<typeof userSettingsResponseSchema>>
>;
export type _UpdateUserSettingsInput = Assert<
  IsEqual<UpdateUserSettingsInput, z.infer<typeof updateUserSettingsInputSchema>>
>;
export type _AuthUser = Assert<IsEqual<AuthUser, z.infer<typeof authUserSchema>>>;
export type _UserAccountResponse = Assert<
  IsEqual<UserAccountResponse, z.infer<typeof userAccountResponseSchema>>
>;
export type _UpdateAccountInput = Assert<
  IsEqual<UpdateAccountInput, z.infer<typeof updateAccountInputSchema>>
>;
export type _ImportFollowupStatus = Assert<
  IsEqual<ImportFollowupStatus, z.infer<typeof importFollowupStatusSchema>>
>;
export type _ImportFollowupPlatform = Assert<
  IsEqual<ImportFollowupPlatform, z.infer<typeof importFollowupPlatformSchema>>
>;
export type _UpdateImportFollowupBody = Assert<
  IsEqual<UpdateImportFollowupBody, z.infer<typeof updateImportFollowupBodySchema>>
>;
export type _UpdateSettingsBody = Assert<
  IsEqual<UpdateSettingsBody, z.infer<typeof updateSettingsBodySchema>>
>;
