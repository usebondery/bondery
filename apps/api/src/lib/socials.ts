import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SocialPlatform } from "@bondery/types";
import type { ContactWithId } from "./schemas.js";

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "linkedin",
  "instagram",
  "whatsapp",
  "facebook",
  "website",
  "signal",
];

export type { SocialPlatform };

type SocialsShape = {
  linkedin: string | null;
  instagram: string | null;
  whatsapp: string | null;
  facebook: string | null;
  website: string | null;
  signal: string | null;
};

type SocialRow = {
  person_id: string;
  platform: string;
  handle: string;
  connected_at: string | null;
};

function emptySocialShape(): SocialsShape {
  return {
    linkedin: null,
    instagram: null,
    whatsapp: null,
    facebook: null,
    website: null,
    signal: null,
  };
}

function asSocialPlatform(value: string): SocialPlatform | null {
  if ((SOCIAL_PLATFORMS as readonly string[]).includes(value)) {
    return value as SocialPlatform;
  }

  return null;
}

/**
 * Loads normalized socials rows and merges them into contact-shaped objects.
 *
 * @param client Authenticated Supabase client.
 * @param userId Authenticated user id.
 * @param contacts Contacts loaded from people table.
 * @returns Contacts with top-level socials fields attached.
 */
export async function attachContactSocials<T extends ContactWithId>(
  client: SupabaseClient<Database>,
  userId: string,
  contacts: T[],
): Promise<Array<T & SocialsShape>> {
  if (!contacts.length) {
    return [];
  }

  const personIds = contacts.map((contact) => contact.id);

  const { data: socialRows, error } = await client
    .from("people_socials")
    .select("person_id, platform, handle, connected_at")
    .eq("user_id", userId)
    .in("person_id", personIds);

  if (error) {
    throw new Error(error.message);
  }

  const map = new Map<string, SocialsShape>();
  for (const contact of contacts) {
    map.set(contact.id, emptySocialShape());
  }

  for (const row of (socialRows || []) as SocialRow[]) {
    const platform = asSocialPlatform(row.platform);
    if (!platform) {
      continue;
    }

    const bucket = map.get(row.person_id);
    if (!bucket) {
      continue;
    }

    bucket[platform] = row.handle;
  }

  return contacts.map((contact) => ({
    ...contact,
    ...(map.get(contact.id) || emptySocialShape()),
  }));
}

/**
 * Upserts or deletes a socials handle for a specific person and platform.
 *
 * @param client Authenticated Supabase client.
 * @param userId Authenticated user id.
 * @param personId Person id.
 * @param platform Social platform.
 * @param handle Handle/URL value. Empty/null removes the row.
 */
export async function upsertContactSocials(
  client: SupabaseClient<Database>,
  userId: string,
  personId: string,
  platform: SocialPlatform,
  handle: string | null | undefined,
  connectedAt?: string | null,
): Promise<void> {
  const normalizedHandle = typeof handle === "string" ? handle.trim() : "";

  if (normalizedHandle.length === 0) {
    const { error: deleteError } = await client
      .from("people_socials")
      .delete()
      .eq("user_id", userId)
      .eq("person_id", personId)
      .eq("platform", platform);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    return;
  }

  const { error: upsertError } = await client.from("people_socials").upsert(
    {
      user_id: userId,
      person_id: personId,
      platform,
      handle: normalizedHandle,
      connected_at: connectedAt ?? null,
    },
    {
      onConflict: "user_id,person_id,platform",
    },
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }
}

/**
 * Finds person id by user and one social platform/handle pair.
 *
 * @param client Authenticated Supabase client.
 * @param userId Authenticated user id.
 * @param platform Social platform.
 * @param handle Handle/URL to match.
 * @returns Matching person id or null.
 */
export async function findPersonIdBySocial(
  client: SupabaseClient<Database>,
  userId: string,
  platform: SocialPlatform,
  handle: string,
): Promise<string | null> {
  const normalizedHandle = handle.trim();
  if (!normalizedHandle) {
    return null;
  }

  const { data, error } = await client
    .from("people_socials")
    .select("person_id")
    .eq("user_id", userId)
    .eq("platform", platform)
    .eq("handle", normalizedHandle)
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.person_id || null;
}
