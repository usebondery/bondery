import type { AvatarTransformOptions, Database } from "@bondery/schemas";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveContactAvatarUrl } from "../data/supabase.js";

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
      hasAvatar: myself?.has_avatar ?? false,
      id: userId,
      updatedAt: myself?.updated_at,
    },
    avatarOptions,
  );

  return {
    avatarUrl,
    firstName: myself?.first_name ?? null,
  };
}
