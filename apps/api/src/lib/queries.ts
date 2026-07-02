/**
 * Supabase select fragments and shared API query helpers (non-validation).
 */

import type { AvatarTransformOptions } from "@bondery/schemas";
import type { AvatarTransformQuery } from "@bondery/schemas/http";

/** Minimal contact reference — used across channels, addresses, enrichment, social-media */
export type ContactWithId = {
  id: string;
  hasAvatar: boolean;
  updatedAt?: string;
};

/** File received from a multipart upload */
export type UploadFile = {
  fileName: string;
  content: Buffer;
};

/** Contact fields selection query for Supabase */
export const CONTACT_SELECT = `
  id,
  userId:user_id,
  firstName:first_name,
  middleName:middle_name,
  lastName:last_name,
  headline,
  location,
  notes,
  notesUpdatedAt:notes_updated_at,
  lastInteraction:last_interaction,
  lastInteractionActivityId:last_interaction_activity_id,
  keepFrequencyDays:keep_frequency_days,
  createdAt:created_at,
  myself,
  language,
  timezone,
  gisPoint:gis_point,
  latitude,
  longitude,
  updatedAt:updated_at,
  hasAvatar:has_avatar
`;

/** Group fields selection query for Supabase */
export const GROUP_SELECT = `
  id,
  userId:user_id,
  label,
  emoji,
  color,
  createdAt:created_at,
  updatedAt:updated_at
`;

/** Tag fields selection query for Supabase */
export const TAG_SELECT = `
  id,
  userId:user_id,
  label,
  color,
  createdAt:created_at,
  updatedAt:updated_at
`;

/** Interaction fields selection query for Supabase */
export const INTERACTION_SELECT = `
  *,
  participants:interaction_participants(
    person:people(
      id,
      first_name,
      last_name,
      updated_at,
      has_avatar
    )
  )
`;

/**
 * Extracts avatar transform options from a parsed query object.
 * Returns `undefined` when neither param is present (no-op for callers).
 */
export function extractAvatarOptions(
  query: Partial<AvatarTransformQuery>,
): AvatarTransformOptions | undefined {
  const { avatarQuality, avatarSize } = query;
  if (!avatarQuality && !avatarSize) return undefined;
  return {
    ...(avatarQuality ? { quality: avatarQuality } : {}),
    ...(avatarSize ? { size: avatarSize } : {}),
  };
}
