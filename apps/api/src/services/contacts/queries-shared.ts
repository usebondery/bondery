import type {
  ContactPreview,
  ContactSelectable,
  ImportantDateType,
  SocialPlatform,
} from "@bondery/schemas";
import type { AvatarTransformQuery } from "@bondery/schemas/http";
import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveContactAvatarUrl } from "../../lib/data/supabase.js";

export const LOOKUP_SOCIAL_PLATFORMS: SocialPlatform[] = ["instagram", "linkedin", "facebook"];

export const IMPORTANT_DATE_TYPES = [
  "birthday",
  "anniversary",
  "nameday",
  "graduation",
  "other",
] satisfies ImportantDateType[];

export type ServiceLog = {
  error: (payload: unknown, message: string) => void;
  warn?: (payload: unknown, message: string) => void;
};

export type MapBoundsQuery = AvatarTransformQuery & {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  limit?: number;
};

export type BySocialQuery = AvatarTransformQuery & {
  platform?: string;
  handle?: string;
};

export function isLookupPlatform(value: string): value is (typeof LOOKUP_SOCIAL_PLATFORMS)[number] {
  return LOOKUP_SOCIAL_PLATFORMS.includes(value as (typeof LOOKUP_SOCIAL_PLATFORMS)[number]);
}

export function toContactPreview(
  client: SupabaseClient<Database>,
  userId: string,
  person: {
    id: string;
    first_name: string;
    last_name: string | null;
    has_avatar: boolean;
    updated_at?: string | null;
  },
  avatarOptions?: Parameters<typeof resolveContactAvatarUrl>[3],
): ContactPreview {
  return {
    avatar: resolveContactAvatarUrl(
      client,
      userId,
      {
        hasAvatar: person.has_avatar,
        id: person.id,
        updatedAt: person.updated_at,
      },
      avatarOptions,
    ),
    firstName: person.first_name,
    id: person.id,
    lastName: person.last_name,
  };
}

export function toContactSelectable(
  client: SupabaseClient<Database>,
  userId: string,
  person: {
    id: string;
    firstName: string;
    middleName?: string | null;
    lastName: string | null;
    headline?: string | null;
    location?: string | null;
    myself?: boolean | null;
    hasAvatar: boolean;
    updatedAt?: string | null;
  },
  avatarOptions?: Parameters<typeof resolveContactAvatarUrl>[3],
): ContactSelectable {
  return {
    avatar: resolveContactAvatarUrl(
      client,
      userId,
      {
        hasAvatar: person.hasAvatar,
        id: person.id,
        updatedAt: person.updatedAt,
      },
      avatarOptions,
    ),
    firstName: person.firstName,
    headline: person.headline ?? null,
    id: person.id,
    lastName: person.lastName,
    location: person.location ?? null,
    middleName: person.middleName ?? null,
    myself: person.myself ?? null,
  };
}
