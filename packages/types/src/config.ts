/**
 * Shared Configuration Types
 * Types for application configuration
 */

/**
 * Input field max lengths configuration
 */
export interface InputMaxLengths {
  firstName: number;
  middleName: number;
  lastName: number;
  headline: number;
  location: number;
  description: number;
  dateName: number;
}

/**
 * Avatar upload configuration
 */
export interface AvatarUploadConfig {
  allowedMimeTypes: readonly string[];
  maxFileSize: number;
  maxFileSizeMB: number;
}

/**
 * Integration provider configuration
 */
export interface IntegrationProvider {
  provider: string;
  providerKey: string;
  displayName: string;
  iconColor: string;
  backgroundColor: string;
  icon: string;
  active: boolean;
}

/**
 * Social platform type
 */
export type SocialPlatform =
  | "linkedin"
  | "instagram"
  | "facebook"
  | "whatsapp"
  | "signal"
  | "website";
