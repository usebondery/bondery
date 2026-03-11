import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Database,
  EmailEntry,
  PhoneEntry,
  ContactAddressEntry,
  AvatarTransformOptions,
} from "@bondery/types";
import { attachContactChannels } from "../routes/contacts/channels.js";
import { attachContactAddresses } from "../routes/contacts/addresses.js";
import { attachContactSocialMedia } from "./social-media.js";
import type { ContactWithId } from "./schemas.js";
import { buildContactAvatarUrl } from "./supabase.js";

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

/**
 * Enriches a list of contacts with channels (phones + emails), optional addresses,
 * and social media — all fetched in parallel.
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
    attachContactSocialMedia(client, userId, contacts),
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
      avatar: buildContactAvatarUrl(
        client,
        userId,
        contact.id,
        options?.avatarOptions,
        contact.updatedAt,
      ),
      linkedin: social?.linkedin ?? null,
      instagram: social?.instagram ?? null,
      whatsapp: social?.whatsapp ?? null,
      facebook: social?.facebook ?? null,
      website: social?.website ?? null,
      signal: social?.signal ?? null,
    };

    if (!includeAddresses) return base;

    return {
      ...base,
      addresses: addressMap.get(contact.id) ?? [],
    };
  });
}
