import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, AvatarTransformOptions } from "@bondery/schemas";
import { resolveContactAvatarUrl } from "./supabase.js";

export type MyselfProfile = {
  firstName: string | null;
  avatarUrl: string | null;
};

/**
 * Returns the authenticated user's display name and avatar URL derived from
 * the "myself" contact record.
 */
export async function getMyselfProfile(
  client: SupabaseClient<Database>,
  userId: string,
  avatarOptions?: AvatarTransformOptions,
): Promise<MyselfProfile> {
  const { data: myself } = await client
    .from("people")
    .select("first_name, updated_at, has_avatar")
    .eq("user_id", userId)
    .eq("myself", true)
    .single();

  const avatarUrl = resolveContactAvatarUrl(
    client,
    userId,
    {
      id: userId,
      hasAvatar: myself?.has_avatar ?? false,
      updatedAt: myself?.updated_at,
    },
    avatarOptions,
  );

  return {
    firstName: myself?.first_name ?? null,
    avatarUrl,
  };
}
