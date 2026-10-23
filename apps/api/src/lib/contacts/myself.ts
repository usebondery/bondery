import type { PrismaClient } from "@bondery/db";
import type { AvatarTransformOptions } from "@bondery/schemas";
import { resolveContactAvatarUrl } from "../storage/avatar-urls.js";

export type MyselfProfile = {
  firstName: string | null;
  avatarUrl: string | null;
};

/**
 * Returns the authenticated user's display name and avatar URL derived from
 * the "myself" contact record.
 */
export async function getMyselfProfile(
  db: PrismaClient,
  userId: string,
  avatarOptions?: AvatarTransformOptions,
): Promise<MyselfProfile> {
  const myself = await db.people.findFirst({
    select: { avatarUpdatedAt: true, firstName: true, hasAvatar: true },
    where: { myself: true, userId },
  });

  const avatarUrl = resolveContactAvatarUrl(
    userId,
    {
      avatarUpdatedAt: myself?.avatarUpdatedAt,
      hasAvatar: myself?.hasAvatar ?? false,
      id: userId,
    },
    avatarOptions,
  );

  return {
    avatarUrl,
    firstName: myself?.firstName ?? null,
  };
}
