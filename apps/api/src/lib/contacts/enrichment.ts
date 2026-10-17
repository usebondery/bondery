import type { PrismaClient } from "@bondery/db";
import type { AvatarTransformOptions, Contact } from "@bondery/schemas";
import { contactDetailSelect, mapContactDetailRecord } from "../data/prisma-mappers.js";
import type { ContactWithId } from "../data/select-fragments.js";
import { resolveContactAvatarUrl } from "../storage/avatar-urls.js";
import {
  type ContactExtrasPayload,
  fetchContactExtras,
  getEmptyContactExtras,
} from "./fetch-contact-extras.js";

type ChannelsAndSocialExtras = {
  phones: ContactExtrasPayload["phones"];
  emails: ContactExtrasPayload["emails"];
  avatar: string | null;
  linkedin: string | null;
  instagram: string | null;
  whatsapp: string | null;
  facebook: string | null;
  website: string | null;
  signal: string | null;
};

export type FullContactExtras = ChannelsAndSocialExtras & {
  addresses: ContactExtrasPayload["addresses"];
};

function withEmptyChannels<T extends { id: string }>(
  rows: T[],
): Array<T & { phones: []; emails: []; addresses: [] }> {
  return rows.map((row) => ({
    ...row,
    addresses: [],
    emails: [],
    phones: [],
  }));
}

function withEmptySocials<
  T extends {
    id: string;
  },
>(
  rows: T[],
): Array<
  T & {
    avatar: null;
    linkedin: null;
    instagram: null;
    whatsapp: null;
    facebook: null;
    website: null;
    signal: null;
  }
> {
  return rows.map((row) => ({
    ...row,
    avatar: null,
    facebook: null,
    instagram: null,
    linkedin: null,
    signal: null,
    website: null,
    whatsapp: null,
  }));
}

function mergeExtrasIntoContact<T extends ContactWithId>(
  userId: string,
  contact: T,
  extras: ContactExtrasPayload,
  options?: { addresses?: boolean; avatarOptions?: AvatarTransformOptions },
): T & ChannelsAndSocialExtras & { addresses?: ContactExtrasPayload["addresses"] } {
  const base: T & ChannelsAndSocialExtras = {
    ...contact,
    avatar: resolveContactAvatarUrl(
      userId,
      {
        avatarUpdatedAt: contact.avatarUpdatedAt,
        hasAvatar: contact.hasAvatar,
        id: contact.id,
      },
      options?.avatarOptions,
    ),
    emails: extras.emails,
    facebook: extras.facebook,
    instagram: extras.instagram,
    linkedin: extras.linkedin,
    phones: extras.phones,
    signal: extras.signal,
    website: extras.website,
    whatsapp: extras.whatsapp,
  };

  if (options?.addresses !== true) {
    return base;
  }

  return {
    ...base,
    addresses: extras.addresses,
  };
}

/**
 * Enriches a list of contacts with channels (phones + emails), optional addresses,
 * and socials via a single RPC batch load.
 */
export async function attachContactExtras<T extends ContactWithId>(
  db: PrismaClient,
  userId: string,
  contacts: T[],
  options: { addresses: true; avatarOptions?: AvatarTransformOptions },
): Promise<Array<T & FullContactExtras>>;

export async function attachContactExtras<T extends ContactWithId>(
  db: PrismaClient,
  userId: string,
  contacts: T[],
  options?: { addresses?: false; avatarOptions?: AvatarTransformOptions },
): Promise<Array<T & ChannelsAndSocialExtras>>;

export async function attachContactExtras<T extends ContactWithId>(
  db: PrismaClient,
  userId: string,
  contacts: T[],
  options?: { addresses?: boolean; avatarOptions?: AvatarTransformOptions },
): Promise<Array<T & ChannelsAndSocialExtras>> {
  if (!contacts.length) {
    return [];
  }

  const includeAddresses = options?.addresses === true;
  const extrasByPersonId = await fetchContactExtras(
    db,
    userId,
    contacts.map((contact) => contact.id),
  );

  return contacts.map((contact) =>
    mergeExtrasIntoContact(
      userId,
      contact,
      extrasByPersonId.get(contact.id) ?? getEmptyContactExtras(),
      { addresses: includeAddresses, avatarOptions: options?.avatarOptions },
    ),
  ) as Array<T & ChannelsAndSocialExtras>;
}

export async function loadEnrichedContact(
  db: PrismaClient,
  userId: string,
  contactId: string,
  options?: { avatarOptions?: AvatarTransformOptions },
  log?: { error: (obj: unknown, msg: string) => void },
): Promise<Contact | null> {
  const contact = await db.people.findFirst({
    select: contactDetailSelect,
    where: { id: contactId, userId },
  });

  if (!contact) {
    return null;
  }

  const mapped = mapContactDetailRecord(contact);

  try {
    const [enrichedContact] = await attachContactExtras(db, userId, [mapped], {
      addresses: true,
      avatarOptions: options?.avatarOptions,
    });
    return enrichedContact as Contact;
  } catch (error) {
    log?.error({ err: error }, "Failed to attach contact extras");
    return withEmptySocials(withEmptyChannels([mapped]))[0] as Contact;
  }
}

export { withEmptyChannels, withEmptySocials };
