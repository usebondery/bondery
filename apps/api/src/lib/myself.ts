import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, AvatarTransformOptions } from "@bondery/types";
import { buildContactAvatarUrl } from "./supabase.js";

export type MyselfProfile = {
  firstName: string | null;
  avatarUrl: string | null;
};

/**
 * Returns the authenticated user's display name and avatar URL derived from
 * the "myself" contact record.
 *
 * All endpoints that expose user identity (/me/settings, /me/person) must
 * produce firstName and avatarUrl from the same source so the values are
 * always consistent:
 *  - /me/settings calls this function directly.
 *  - /me/person goes through attachContactExtras → buildContactAvatarUrl,
 *    which is equivalent because the myself contact's people.id equals the
 *    auth user's UUID (enforced by migration
 *    20260326100000_align_myself_contact_id_to_user_id), so both code paths
 *    resolve the same storage path: avatars/{userId}/{userId}.jpg.
 *
 * @param client - Authenticated Supabase client.
 * @param userId - Authenticated user ID.
 * @param avatarOptions - Optional transform options (size, quality).
 */
export async function getMyselfProfile(
  client: SupabaseClient<Database>,
  userId: string,
  avatarOptions?: AvatarTransformOptions,
): Promise<MyselfProfile> {
  const { data: myself } = await client
    .from("people")
    .select("first_name, updated_at")
    .eq("user_id", userId)
    .eq("myself", true)
    .single();

  // The myself contact always has people.id === auth user id, so the avatar
  // is stored at avatars/{userId}/{userId}.jpg — pass userId for both args.
  const avatarUrl = buildContactAvatarUrl(
    client,
    userId,
    userId,
    avatarOptions,
    myself?.updated_at ?? null,
  );

  return {
    firstName: myself?.first_name ?? null,
    avatarUrl,
  };
}
