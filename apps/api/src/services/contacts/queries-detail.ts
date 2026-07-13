import type {
  AvatarTransformOptions,
  Contact,
  GroupWithCount,
  ImportantDateType,
} from "@bondery/schemas";
import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { attachContactExtras, loadEnrichedContact } from "../../lib/contacts/enrichment.js";
import { findPersonIdBySocial } from "../../lib/contacts/socials.js";
import { generateVCard } from "../../lib/contacts/vcard.js";
import {
  CONTACT_SELECT,
  extractAvatarOptions,
  GROUP_SELECT,
} from "../../lib/data/select-fragments.js";
import { badRequest, internal, notFound } from "../../lib/platform/errors/http-errors.js";
import { withEmptyChannels, withEmptySocials } from "./helpers.js";
import {
  type BySocialQuery,
  IMPORTANT_DATE_TYPES,
  isLookupPlatform,
  type ServiceLog,
  toContactPreview,
} from "./queries-shared.js";

export async function getContact(
  client: SupabaseClient<Database>,
  userId: string,
  contactId: string,
  avatarOptions?: AvatarTransformOptions,
  log?: ServiceLog,
) {
  const enrichedContact = await loadEnrichedContact(
    client,
    userId,
    contactId,
    { avatarOptions },
    log,
  );

  if (!enrichedContact) {
    throw notFound("Contact not found", "not_found");
  }

  return { contact: enrichedContact };
}

export async function findContactBySocial(
  client: SupabaseClient<Database>,
  userId: string,
  query: BySocialQuery,
) {
  const platform = query.platform?.trim() ?? "";
  const handle = query.handle?.trim() ?? "";
  const avatarOpts = extractAvatarOptions(query);

  if (!platform || !handle || !isLookupPlatform(platform)) {
    throw badRequest("Invalid platform or handle", "bad_request");
  }

  const personId = await findPersonIdBySocial(client, userId, platform, handle);

  if (!personId) {
    return { exists: false as const };
  }

  const { data: person, error } = await client
    .from("people")
    .select("id, first_name, last_name, updated_at, has_avatar")
    .eq("user_id", userId)
    .eq("id", personId)
    .single();

  if (error || !person) {
    throw internal("internal_server_error", error?.message ?? "Failed to find contact");
  }

  return {
    contact: toContactPreview(client, userId, person, avatarOpts),
    exists: true as const,
  };
}

export async function getContactGroups(client: SupabaseClient<Database>, personId: string) {
  const { data: memberships, error: membershipsError } = await client
    .from("people_groups")
    .select("group_id")
    .eq("person_id", personId);

  if (membershipsError) {
    throw internal("internal_server_error", membershipsError.message);
  }

  const groupIds = (memberships || []).map((m) => m.group_id);

  if (groupIds.length === 0) {
    return { groups: [] as GroupWithCount[] };
  }

  const { data: groups, error: groupsError } = await client
    .from("groups")
    .select(GROUP_SELECT)
    .in("id", groupIds)
    .order("label", { ascending: true });

  if (groupsError) {
    throw internal("internal_server_error", groupsError.message);
  }

  const { data: groupMemberships, error: countsError } = await client
    .from("people_groups")
    .select("group_id")
    .in("group_id", groupIds);

  if (countsError) {
    throw internal("internal_server_error", countsError.message);
  }

  const countMap = new Map<string, number>();
  groupMemberships?.forEach((item) => {
    const current = countMap.get(item.group_id) || 0;
    countMap.set(item.group_id, current + 1);
  });

  const groupsWithCounts = (groups || []).map((group) => ({
    ...group,
    contactCount: countMap.get(group.id) || 0,
  }));

  return { groups: groupsWithCounts };
}

export async function getContactVCardExport(
  client: SupabaseClient<Database>,
  userId: string,
  contactId: string,
  avatarOptions?: AvatarTransformOptions,
  log?: ServiceLog,
) {
  const { data: contact, error } = await client
    .from("people")
    .select(CONTACT_SELECT)
    .eq("id", contactId)
    .eq("user_id", userId)
    .single();

  if (error || !contact) {
    throw notFound("Contact not found", "not_found");
  }

  let contactWithChannels: Contact;
  try {
    const [enrichedContact] = await attachContactExtras(client, userId, [contact], {
      addresses: true,
      avatarOptions,
    });
    contactWithChannels = enrichedContact as Contact;
  } catch (channelError) {
    log?.error({ channelError }, "Failed to attach contact channels/social media for vCard export");
    contactWithChannels = withEmptySocials(withEmptyChannels([contact]))[0] as unknown as Contact;
  }

  let exportImportantDates: Array<{
    type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
    date: string;
  }> = [];
  let exportCategories: string[] = [];

  try {
    const [{ data: importantDates }, { data: peopleTags }] = await Promise.all([
      client
        .from("people_important_dates")
        .select("type, date")
        .eq("person_id", contactId)
        .eq("user_id", userId),
      client.from("people_tags").select("tag_id").eq("person_id", contactId).eq("user_id", userId),
    ]);

    exportImportantDates = (importantDates ?? [])
      .map((entry) => ({
        date: entry.date,
        type: entry.type,
      }))
      .filter(
        (
          entry,
        ): entry is {
          type: "birthday" | "anniversary" | "nameday" | "graduation" | "other";
          date: string;
        } =>
          IMPORTANT_DATE_TYPES.includes(entry.type as ImportantDateType) &&
          typeof entry.date === "string" &&
          entry.date.trim().length > 0,
      );

    const tagIds = Array.from(
      new Set((peopleTags ?? []).map((entry) => entry.tag_id).filter(Boolean)),
    );

    if (tagIds.length > 0) {
      const { data: tags } = await client
        .from("tags")
        .select("label")
        .eq("user_id", userId)
        .in("id", tagIds);

      exportCategories = Array.from(
        new Set(
          (tags ?? []).map((entry) => entry.label).filter((label): label is string => !!label),
        ),
      );
    }
  } catch (extrasError) {
    log?.warn?.({ extrasError }, "Failed to fetch important dates/tags for vCard export");
  }

  let vcard: string;
  try {
    vcard = await generateVCard(contactWithChannels, {
      categories: exportCategories,
      importantDates: exportImportantDates,
    });
  } catch (vcardError) {
    log?.error({ vcardError }, "Failed to generate vCard");
    throw internal("failed_to_generate_vcard");
  }

  const firstName = contact.firstName || "contact";
  const lastName = contact.lastName || "";
  const filename = lastName ? `${firstName}_${lastName}.vcf` : `${firstName}.vcf`;

  return { filename, vcard };
}
