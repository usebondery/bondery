import type { Database, InstagramImportSource } from "@bondery/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type DefaultImportGroupKey =
  | "linkedin_import"
  | "instagram_followers"
  | "instagram_following"
  | "instagram_close_friends"
  | "extension_linkedin"
  | "extension_instagram";

const DEFAULT_IMPORT_GROUPS: Record<
  DefaultImportGroupKey,
  {
    label: string;
    color: string;
    emoji: string;
  }
> = {
  linkedin_import: {
    label: "LinkedIn: Connections",
    color: "#0A66C2",
    emoji: "💼",
  },
  instagram_followers: {
    label: "Instagram: Followers",
    color: "#E4405F",
    emoji: "📷",
  },
  instagram_following: {
    label: "Instagram: Following",
    color: "#C13584",
    emoji: "📷",
  },
  instagram_close_friends: {
    label: "Instagram: Close Friends",
    color: "#4CAF50",
    emoji: "✨",
  },
  extension_linkedin: {
    label: "LinkedIn: Extension Import",
    color: "#0A66C2",
    emoji: "💼",
  },
  extension_instagram: {
    label: "Instagram: Extension Import",
    color: "#E4405F",
    emoji: "📷",
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
      user_id: userId,
      label: defaults.label,
      emoji: defaults.emoji,
      color: defaults.color,
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
    user_id: userId,
    person_id: personId,
    group_id: groupId,
  }));

  const { error } = await client.from("people_groups").upsert(memberships, {
    onConflict: "person_id,group_id",
    ignoreDuplicates: true,
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
