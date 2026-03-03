import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, EmailEntry, PhoneEntry, ContactAddressEntry } from "@bondery/types";
import { attachContactChannels } from "./contact-channels.js";
import { attachContactAddresses } from "./contact-addresses.js";
import { attachContactSocialMedia } from "./social-media.js";

type ContactWithId = { id: string };

type FullContactExtras = {
  phones: PhoneEntry[];
  emails: EmailEntry[];
  addresses: ContactAddressEntry[];
  linkedin: string | null;
  instagram: string | null;
  whatsapp: string | null;
  facebook: string | null;
  website: string | null;
  signal: string | null;
};

type ChannelsAndSocialExtras = {
  phones: PhoneEntry[];
  emails: EmailEntry[];
  linkedin: string | null;
  instagram: string | null;
  whatsapp: string | null;
  facebook: string | null;
  website: string | null;
  signal: string | null;
};

/**
 * Loads channels (phones + emails), addresses, and social media for a list of contacts
 * in parallel, then merges everything by person ID.
 *
 * @param client Authenticated Supabase client.
 * @param userId Authenticated user id.
 * @param contacts Contacts loaded from `people` table.
 * @returns Contacts with phones, emails, addresses, and social media fields attached.
 */
export async function attachAllContactExtras<T extends ContactWithId>(
  client: SupabaseClient<Database>,
  userId: string,
  contacts: T[],
): Promise<Array<T & FullContactExtras>> {
  if (!contacts.length) {
    return [];
  }

  const [channelsResult, addressesResult, socialResult] = await Promise.all([
    attachContactChannels(client, userId, contacts),
    attachContactAddresses(client, userId, contacts),
    attachContactSocialMedia(client, userId, contacts),
  ]);

  // Build lookup maps keyed by person ID for addresses and social media
  const addressMap = new Map<string, (typeof addressesResult)[number]>();
  for (const row of addressesResult) {
    addressMap.set(row.id, row);
  }

  const socialMap = new Map<string, (typeof socialResult)[number]>();
  for (const row of socialResult) {
    socialMap.set(row.id, row);
  }

  // Merge: channels are the base, then layer in addresses + social
  return channelsResult.map((contact) => {
    const addr = addressMap.get(contact.id);
    const social = socialMap.get(contact.id);

    return {
      ...contact,
      addresses: addr?.addresses ?? [],
      linkedin: social?.linkedin ?? null,
      instagram: social?.instagram ?? null,
      whatsapp: social?.whatsapp ?? null,
      facebook: social?.facebook ?? null,
      website: social?.website ?? null,
      signal: social?.signal ?? null,
    };
  });
}

/**
 * Loads channels (phones + emails) and social media for a list of contacts
 * in parallel, without addresses. Used by endpoints that don't need address data.
 *
 * @param client Authenticated Supabase client.
 * @param userId Authenticated user id.
 * @param contacts Contacts loaded from `people` table.
 * @returns Contacts with phones, emails, and social media fields attached.
 */
export async function attachContactChannelsAndSocial<T extends ContactWithId>(
  client: SupabaseClient<Database>,
  userId: string,
  contacts: T[],
): Promise<Array<T & ChannelsAndSocialExtras>> {
  if (!contacts.length) {
    return [];
  }

  const [channelsResult, socialResult] = await Promise.all([
    attachContactChannels(client, userId, contacts),
    attachContactSocialMedia(client, userId, contacts),
  ]);

  const socialMap = new Map<string, (typeof socialResult)[number]>();
  for (const row of socialResult) {
    socialMap.set(row.id, row);
  }

  return channelsResult.map((contact) => {
    const social = socialMap.get(contact.id);

    return {
      ...contact,
      linkedin: social?.linkedin ?? null,
      instagram: social?.instagram ?? null,
      whatsapp: social?.whatsapp ?? null,
      facebook: social?.facebook ?? null,
      website: social?.website ?? null,
      signal: social?.signal ?? null,
    };
  });
}
