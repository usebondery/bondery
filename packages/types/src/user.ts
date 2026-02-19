/**
 * User Domain Types
 * Types for user account and settings
 */

/**
 * User settings stored in database
 */
export type ColorSchemePreference = "light" | "dark" | "auto";

export interface UserSettings {
  id?: string;
  user_id: string;
  name: string | null;
  middlename: string | null;
  surname: string | null;
  timezone: string | null;
  reminder_send_hour: string;
  language: string | null;
  color_scheme: ColorSchemePreference;
  avatar_url: string | null;
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
  name?: string;
  middlename?: string;
  surname?: string;
  timezone?: string;
  reminder_send_hour?: string;
  language?: string;
  color_scheme?: ColorSchemePreference;
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
