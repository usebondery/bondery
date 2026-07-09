import type { Database, InstagramImportSource } from "@bondery/schemas";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DefaultImportGroupKey =
  | "linkedin_import"
  | "instagram_followers"
  | "instagram_following"
  | "instagram_close_friends"
  | "extension_linkedin"
  | "extension_instagram"
  | "vcard_import";

const DEFAULT_IMPORT_GROUPS: Record<
  DefaultImportGroupKey,
  {
    label: string;
    color: string;
    emoji: string;
  }
> = {
  extension_instagram: {
    color: "#E4405F",
    emoji: "📷",
    label: "Instagram: Extension Import",
  },
  extension_linkedin: {
    color: "#0A66C2",
    emoji: "💼",
    label: "LinkedIn: Extension Import",
  },
  instagram_close_friends: {
    color: "#4CAF50",
    emoji: "✨",
    label: "Instagram: Close Friends",
  },
  instagram_followers: {
    color: "#E4405F",
    emoji: "📷",
    label: "Instagram: Followers",
  },
  instagram_following: {
    color: "#C13584",
    emoji: "📷",
    label: "Instagram: Following",
  },
  linkedin_import: {
    color: "#0A66C2",
    emoji: "💼",
    label: "LinkedIn: Connections",
  },
  vcard_import: {
    color: "#4CAF50",
    emoji: "📱",
    label: "Mobile Contacts",
  },
};

/**
 * Ensures the given default import group exists for a user and returns its id.
 *
 * The group is identified by its default label. If no such group exists,
 * a new one is created with the default emoji and color.
 */
export async function ensureDefaultImportGroup(
  client: SupabaseClient<Database>,
  userId: string,
  key: DefaultImportGroupKey,
): Promise<string> {
  const defaults = DEFAULT_IMPORT_GROUPS[key];

  const { data: existingGroups, error: lookupError } = await client
    .from("groups")
    .select("id")
    .eq("user_id", userId)
    .eq("label", defaults.label)
    .order("created_at", { ascending: true })
    .limit(1);

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  const existing = existingGroups?.[0];
  if (existing?.id) {
    return existing.id;
  }

  const { data: createdGroup, error: createError } = await client
    .from("groups")
    .insert({
      color: defaults.color,
      emoji: defaults.emoji,
      label: defaults.label,
      user_id: userId,
    })
    .select("id")
    .single();

  if (createError || !createdGroup) {
    throw new Error(createError?.message || "Failed to create default import group");
  }

  return createdGroup.id;
}

/**
 * Ensures default import group exists and upserts memberships for provided contacts.
 *
 * Only unique person ids are inserted and duplicate memberships are ignored.
 */
export async function assignContactsToDefaultImportGroup(
  client: SupabaseClient<Database>,
  userId: string,
  key: DefaultImportGroupKey,
  personIds: string[],
): Promise<void> {
  const uniquePersonIds = Array.from(new Set(personIds.filter(Boolean)));

  if (uniquePersonIds.length === 0) {
    return;
  }

  const groupId = await ensureDefaultImportGroup(client, userId, key);

  const memberships = uniquePersonIds.map((personId) => ({
    group_id: groupId,
    person_id: personId,
    user_id: userId,
  }));

  const { error } = await client.from("people_groups").upsert(memberships, {
    ignoreDuplicates: true,
    onConflict: "person_id,group_id",
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Maps Instagram import sources to default auto-group keys.
 *
 * @param sources Sources attached to a parsed Instagram contact.
 * @returns Unique default-group keys that should receive this contact.
 */
export function toInstagramImportGroupKeys(
  sources: InstagramImportSource[],
): DefaultImportGroupKey[] {
  const keys = new Set<DefaultImportGroupKey>();

  for (const source of sources) {
    if (source === "followers") {
      keys.add("instagram_followers");
      continue;
    }

    if (source === "following") {
      keys.add("instagram_following");
      continue;
    }

    if (source === "close_friends") {
      keys.add("instagram_close_friends");
    }
  }

  return Array.from(keys);
}
