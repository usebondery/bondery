import type {
  AvatarTransformOptions,
  Contact,
  ContactAddressEntry,
  Database,
  EmailEntry,
  PhoneEntry,
} from "@bondery/schemas";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTACT_SELECT, type ContactWithId } from "../data/select-fragments.js";
import { resolveContactAvatarUrl } from "../data/supabase.js";
import {
  type ContactExtrasPayload,
  fetchContactExtras,
  getEmptyContactExtras,
} from "./fetch-contact-extras.js";

type ChannelsAndSocialExtras = {
  phones: PhoneEntry[];
  emails: EmailEntry[];
  avatar: string | null;
  linkedin: string | null;
  instagram: string | null;
  whatsapp: string | null;
  facebook: string | null;
  website: string | null;
  signal: string | null;
};

export type FullContactExtras = ChannelsAndSocialExtras & {
  addresses: ContactAddressEntry[];
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
  client: SupabaseClient<Database>,
  userId: string,
  contact: T,
  extras: ContactExtrasPayload,
  options?: { addresses?: boolean; avatarOptions?: AvatarTransformOptions },
): T & ChannelsAndSocialExtras & { addresses?: ContactAddressEntry[] } {
  const base: T & ChannelsAndSocialExtras = {
    ...contact,
    avatar: resolveContactAvatarUrl(
      client,
      userId,
      {
        hasAvatar: contact.hasAvatar,
        id: contact.id,
        updatedAt: contact.updatedAt,
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
  client: SupabaseClient<Database>,
  userId: string,
  contacts: T[],
  options: { addresses: true; avatarOptions?: AvatarTransformOptions },
): Promise<Array<T & FullContactExtras>>;

export async function attachContactExtras<T extends ContactWithId>(
  client: SupabaseClient<Database>,
  userId: string,
  contacts: T[],
  options?: { addresses?: false; avatarOptions?: AvatarTransformOptions },
): Promise<Array<T & ChannelsAndSocialExtras>>;

export async function attachContactExtras<T extends ContactWithId>(
  client: SupabaseClient<Database>,
  userId: string,
  contacts: T[],
  options?: { addresses?: boolean; avatarOptions?: AvatarTransformOptions },
): Promise<Array<T & ChannelsAndSocialExtras>> {
  if (!contacts.length) {
    return [];
  }

  const includeAddresses = options?.addresses === true;
  const extrasByPersonId = await fetchContactExtras(
    client,
    userId,
    contacts.map((contact) => contact.id),
  );

  return contacts.map((contact) =>
    mergeExtrasIntoContact(
      client,
      userId,
      contact,
      extrasByPersonId.get(contact.id) ?? getEmptyContactExtras(),
      { addresses: includeAddresses, avatarOptions: options?.avatarOptions },
    ),
  ) as Array<T & ChannelsAndSocialExtras>;
}

export async function loadEnrichedContact(
  client: SupabaseClient<Database>,
  userId: string,
  contactId: string,
  options?: { avatarOptions?: AvatarTransformOptions },
  log?: { error: (obj: unknown, msg: string) => void },
): Promise<Contact | null> {
  const { data: contact, error } = await client
    .from("people")
    .select(CONTACT_SELECT)
    .eq("id", contactId)
    .single();

  if (error || !contact) {
    return null;
  }

  try {
    const [enrichedContact] = await attachContactExtras(client, userId, [contact], {
      addresses: true,
      avatarOptions: options?.avatarOptions,
    });
    return enrichedContact as Contact;
  } catch (error) {
    // Single-contact reads degrade gracefully so detail/vCard routes still return base identity.
    log?.error({ err: error }, "Failed to attach contact extras");
    return withEmptySocials(withEmptyChannels([contact]))[0] as Contact;
  }
}
