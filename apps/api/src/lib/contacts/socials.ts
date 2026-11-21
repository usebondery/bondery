import type { PrismaClient } from "@bondery/db";
import type { SocialPlatform } from "@bondery/schemas";
import type { ContactWithId } from "../data/select-fragments.js";

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

function emptySocialShape(): SocialsShape {
  return {
    facebook: null,
    instagram: null,
    linkedin: null,
    signal: null,
    website: null,
    whatsapp: null,
  };
}

function asSocialPlatform(value: string): SocialPlatform | null {
  if ((SOCIAL_PLATFORMS as readonly string[]).includes(value)) {
    return value as SocialPlatform;
  }

  return null;
}

/** Loads normalized socials rows and merges them into contact-shaped objects. */
export async function attachContactSocials<T extends ContactWithId>(
  db: PrismaClient,
  userId: string,
  contacts: T[],
): Promise<Array<T & SocialsShape>> {
  if (contacts.length === 0) {
    return [];
  }

  const personIds = contacts.map((contact) => contact.id);

  const socialRows = await db.peopleSocial.findMany({
    select: { handle: true, personId: true, platform: true },
    where: { personId: { in: personIds }, userId },
  });

  const map = new Map<string, SocialsShape>();
  for (const contact of contacts) {
    map.set(contact.id, emptySocialShape());
  }

  for (const row of socialRows) {
    const platform = asSocialPlatform(row.platform);
    if (!platform) {
      continue;
    }

    const bucket = map.get(row.personId);
    if (!bucket) {
      continue;
    }

    bucket[platform] = row.handle;
  }

  return contacts.map((contact) => ({
    ...contact,
    ...(map.get(contact.id) ?? emptySocialShape()),
  }));
}

/** Upserts or deletes a socials handle for a specific person and platform. */
export async function upsertContactSocials(
  db: PrismaClient,
  userId: string,
  personId: string,
  platform: SocialPlatform,
  handle: string | null | undefined,
  connectedAt?: string | null,
): Promise<void> {
  const normalizedHandle = typeof handle === "string" ? handle.trim() : "";

  if (normalizedHandle.length === 0) {
    await db.peopleSocial.deleteMany({
      where: { personId, platform, userId },
    });
    return;
  }

  const existing = await db.peopleSocial.findFirst({
    select: { id: true },
    where: { personId, platform, userId },
  });

  if (existing) {
    await db.peopleSocial.update({
      data: {
        connectedAt: connectedAt ? new Date(connectedAt) : null,
        handle: normalizedHandle,
      },
      where: { id: existing.id },
    });
    return;
  }

  await db.peopleSocial.create({
    data: {
      connectedAt: connectedAt ? new Date(connectedAt) : null,
      handle: normalizedHandle,
      personId,
      platform,
      userId,
    },
  });
}

/** Finds person id by user and one social platform/handle pair. */
export async function findPersonIdBySocial(
  db: PrismaClient,
  userId: string,
  platform: SocialPlatform,
  handle: string,
): Promise<string | null> {
  const normalizedHandle = handle.trim();
  if (!normalizedHandle) {
    return null;
  }

  const row = await db.peopleSocial.findFirst({
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: { personId: true },
    where: { handle: normalizedHandle, platform, userId },
  });

  return row?.personId ?? null;
}
