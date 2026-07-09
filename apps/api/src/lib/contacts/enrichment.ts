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
import { attachContactAddresses } from "./addresses.js";
import { attachContactChannels } from "./channels.js";
import { attachContactSocials } from "./socials.js";

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

/**
 * Enriches a list of contacts with channels (phones + emails), optional addresses,
 * and socials — all fetched in parallel.
 *
 * The overload accepting `{ addresses: true }` widens the return type to include
 * the `addresses` field, while the default (no option / `{ addresses: false }`)
 * omits it, skipping the extra DB query.
 *
 * @param client  Authenticated Supabase client.
 * @param userId  Authenticated user ID.
 * @param contacts  Contacts loaded from the `people` table.
 * @param options  Optional enrichment flags. Pass `{ addresses: true }` to include addresses.
 * @returns  Contacts with the requested extra fields attached.
 *
 * @example
 * // All three (channels + addresses + social):
 * const enriched = await attachContactExtras(client, userId, contacts, { addresses: true });
 *
 * @example
 * // Channels + social only (e.g. group contacts view):
 * const enriched = await attachContactExtras(client, userId, contacts);
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

  const [channelsResult, maybeAddresses, socialResult] = await Promise.all([
    attachContactChannels(client, userId, contacts),
    includeAddresses ? attachContactAddresses(client, userId, contacts) : Promise.resolve(null),
    attachContactSocials(client, userId, contacts),
  ]);

  const socialMap = new Map<string, (typeof socialResult)[number]>();
  for (const row of socialResult) {
    socialMap.set(row.id, row);
  }

  const addressMap = new Map<string, ContactAddressEntry[]>();
  if (maybeAddresses) {
    for (const row of maybeAddresses) {
      addressMap.set(row.id, row.addresses ?? []);
    }
  }

  return channelsResult.map((contact) => {
    const social = socialMap.get(contact.id);
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
      facebook: social?.facebook ?? null,
      instagram: social?.instagram ?? null,
      linkedin: social?.linkedin ?? null,
      signal: social?.signal ?? null,
      website: social?.website ?? null,
      whatsapp: social?.whatsapp ?? null,
    };

    if (!includeAddresses) {
      return base;
    }

    return {
      ...base,
      addresses: addressMap.get(contact.id) ?? [],
    };
  });
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
  } catch (channelError) {
    log?.error({ channelError }, "Failed to attach contact extras");
    return withEmptySocials(withEmptyChannels([contact]))[0] as Contact;
  }
}
