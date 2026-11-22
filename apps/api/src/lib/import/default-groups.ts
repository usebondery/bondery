import type { InstagramImportSource } from "@bondery/schemas";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";

type DefaultImportGroupKey =
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

export type { DefaultImportGroupKey };

/**
 * Ensures the given default import group exists for a user and returns its id.
 *
 * The group is identified by its default label. If no such group exists,
 * a new one is created with the default emoji and color.
 */
export async function ensureDefaultImportGroup(
  ctx: DomainContext,
  key: DefaultImportGroupKey,
): Promise<string> {
  const { user } = ctx;
  const db = domainDb(ctx);
  const defaults = DEFAULT_IMPORT_GROUPS[key];

  const existing = await db.group.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
    where: { label: defaults.label, userId: user.id },
  });

  if (existing?.id) {
    return existing.id;
  }

  const createdGroup = await db.group.create({
    data: {
      color: defaults.color,
      emoji: defaults.emoji,
      label: defaults.label,
      userId: user.id,
    },
    select: { id: true },
  });

  return createdGroup.id;
}

/**
 * Ensures default import group exists and upserts memberships for provided contacts.
 *
 * Only unique person ids are inserted and duplicate memberships are ignored.
 */
export async function assignContactsToDefaultImportGroup(
  ctx: DomainContext,
  key: DefaultImportGroupKey,
  personIds: string[],
): Promise<void> {
  const { user } = ctx;
  const db = domainDb(ctx);
  const uniquePersonIds = Array.from(new Set(personIds.filter(Boolean)));

  if (uniquePersonIds.length === 0) {
    return;
  }

  const groupId = await ensureDefaultImportGroup(ctx, key);

  await db.peopleGroup.createMany({
    data: uniquePersonIds.map((personId) => ({
      groupId,
      personId,
      userId: user.id,
    })),
    skipDuplicates: true,
  });
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
