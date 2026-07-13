import type { SupportedLocale } from "#locale/supported-locale/types.js";

export type ColorSchemePreference = "light" | "dark" | "auto";
export type TimeFormatPreference = "24h" | "12h";
export type SwipeActionPreference = "call" | "message" | "email";
export type GroupSortOrderPreference =
  | "recent-opened"
  | "count-desc"
  | "count-asc"
  | "alpha-asc"
  | "alpha-desc";
export type TagSortOrderPreference = "count-desc" | "count-asc" | "alpha-asc" | "alpha-desc";
export type ImportFollowupStatus = "awaiting_export" | "dismissed";
export type ImportFollowupPlatform = "linkedin" | "instagram";

export interface UserSettings {
  aiMessagesUsed?: number;
  avatarUrl: string | null;
  colorScheme: ColorSchemePreference;
  gettingStartedDismissedAt?: string | null;
  groupSortOrder: string;
  importCompletedAt?: string | null;
  importFollowupPlatform?: ImportFollowupPlatform | null;
  importFollowupStatus?: ImportFollowupStatus | null;
  language: SupportedLocale;
  leftSwipeAction: string;
  name?: string | null;
  onboardingCompletedAt: string | null;
  reminderSendHour: string;
  rightSwipeAction: string;
  tagSortOrder: string;
  timeFormat: string;
  timezone: string | null;
}

export interface UpdateUserSettingsInput {
  colorScheme?: ColorSchemePreference;
  groupSortOrder?: GroupSortOrderPreference;
  language?: SupportedLocale;
  leftSwipeAction?: SwipeActionPreference;
  reminderSendHour?: string;
  rightSwipeAction?: SwipeActionPreference;
  tagSortOrder?: TagSortOrderPreference;
  timeFormat?: TimeFormatPreference;
  timezone?: string;
}

export interface UpdateSettingsBody extends UpdateUserSettingsInput {
  onlyIfNewSignup?: boolean;
}

export interface UserIdentity {
  id: string;
  identity_id: string;
  provider: string;
  user_id: string;
}

export interface UserSettingsResponseData extends UserSettings {
  email?: string | null;
  identities?: UserIdentity[];
  providers?: string[];
}

export interface UserSettingsResponse {
  data: UserSettingsResponseData;
  success: boolean;
}

export interface AuthUser {
  email: string;
  id: string;
  name: string;
}

export interface UserAccountResponse {
  data: {
    email?: string;
    id: string;
    user_metadata: {
      avatar_url?: string | null;
      middlename?: string;
      name?: string;
      surname?: string;
      [key: string]: unknown;
    };
  };
  success: boolean;
}

export interface UpdateAccountInput {
  middlename?: string;
  name?: string;
  surname?: string;
}

export interface UpdateImportFollowupBody {
  platform?: ImportFollowupPlatform;
  status: ImportFollowupStatus;
}
