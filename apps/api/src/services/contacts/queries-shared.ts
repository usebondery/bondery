import type {
  ContactPreview,
  ContactSelectable,
  ImportantDateType,
  SocialPlatform,
} from "@bondery/schemas";
import type { AvatarTransformQuery } from "@bondery/schemas/http";
import { resolveContactAvatarUrl } from "../../lib/storage/avatar-urls.js";

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
  userId: string,
  person: {
    id: string;
    firstName: string;
    lastName: string | null;
    hasAvatar: boolean;
    avatarUpdatedAt?: Date | string | null;
  },
  avatarOptions?: Parameters<typeof resolveContactAvatarUrl>[2],
): ContactPreview {
  return {
    avatar: resolveContactAvatarUrl(
      userId,
      {
        avatarUpdatedAt: person.avatarUpdatedAt,
        hasAvatar: person.hasAvatar,
        id: person.id,
      },
      avatarOptions,
    ),
    firstName: person.firstName,
    id: person.id,
    lastName: person.lastName,
  };
}

export function toContactSelectable(
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
    avatarUpdatedAt?: Date | string | null;
  },
  avatarOptions?: Parameters<typeof resolveContactAvatarUrl>[2],
): ContactSelectable {
  return {
    avatar: resolveContactAvatarUrl(
      userId,
      {
        avatarUpdatedAt: person.avatarUpdatedAt,
        hasAvatar: person.hasAvatar,
        id: person.id,
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
