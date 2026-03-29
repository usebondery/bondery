/**
 * User Domain Types
 * Types for user account and settings
 */

/**
 * User settings stored in database
 */
export type ColorSchemePreference = "light" | "dark" | "auto";
export type TimeFormatPreference = "24h" | "12h";

export interface UserSettings {
  id?: string;
  user_id: string;
  name?: string | null;
  timezone: string | null;
  reminderSendHour: string;
  timeFormat: TimeFormatPreference;
  language: string | null;
  colorScheme: ColorSchemePreference;
  avatarUrl: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/**
 * User settings response with additional auth data
 */
export interface UserSettingsResponse {
  success: boolean;
  data: UserSettings & {
    email?: string;
    providers?: string[];
  };
}

/**
 * Input for updating user settings
 */
export interface UpdateUserSettingsInput {
  timezone?: string;
  reminderSendHour?: string;
  timeFormat?: TimeFormatPreference;
  language?: string;
  colorScheme?: ColorSchemePreference;
}

/**
 * Authenticated user information
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

/**
 * User account data response
 */
export interface UserAccountResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    user_metadata: {
      name: string;
      middlename: string;
      surname: string;
      avatar_url: string | null;
    };
  };
}

/**
 * Input for updating user account metadata
 */
export interface UpdateAccountInput {
  name?: string;
  middlename?: string;
  surname?: string;
}
