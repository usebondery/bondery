import type { ContactPreview, Tag, TagWithCount } from "@bondery/schemas";
import type { AvatarTransformQuery, PeopleListQuery } from "@bondery/schemas/http";
import type { Database } from "@bondery/schemas/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildPaginatedResponse,
  buildPaginationMeta,
  normalizeSearch,
  parsePagination,
  resolveSort,
} from "../../lib/data/pagination.js";
import {
  countSearchPeopleIds,
  restoreRankedOrder,
  searchPeopleIds,
} from "../../lib/data/search.js";
import { extractAvatarOptions, TAG_SELECT } from "../../lib/data/select-fragments.js";
import { resolveContactAvatarUrl } from "../../lib/data/supabase.js";
import { internal, notFound } from "../../lib/platform/errors/http-errors.js";

export type PreviewListQuery = AvatarTransformQuery & {
  previewLimit?: number | string;
};

export async function listTags(
  client: SupabaseClient<Database>,
  userId: string,
  query?: PreviewListQuery,
) {
  const previewLimitRaw = query?.previewLimit;
  const previewLimit = previewLimitRaw ? Number(previewLimitRaw) : 3;
  const includePreview = previewLimit > 0;
  const avatarOptions = extractAvatarOptions(query ?? {});

  const { data: tags, error: tagsError } = await client
    .from("tags")
    .select(TAG_SELECT)
    .order("label", { ascending: true });

  if (tagsError) {
    throw internal("internal_server_error", tagsError.message);
  }

  const { data: memberships, error: countsError } = await client
    .from("people_tags")
    .select("tag_id, person_id");

  if (countsError) {
    throw internal("internal_server_error", countsError.message);
  }

  const countMap = new Map<string, number>();
  const previewMap = new Map<string, string[]>();

  memberships?.forEach((item: { tag_id: string; person_id: string }) => {
    const current = countMap.get(item.tag_id) || 0;
    countMap.set(item.tag_id, current + 1);

    if (!includePreview) {
      return;
    }

    const existing = previewMap.get(item.tag_id) || [];
    if (existing.length < previewLimit) {
      existing.push(item.person_id);
      previewMap.set(item.tag_id, existing);
    }
  });

  let previewContactsById = new Map<string, ContactPreview>();

  if (includePreview) {
    const previewIds = Array.from(new Set(Array.from(previewMap.values()).flat()));

    if (previewIds.length > 0) {
      const { data: previewContacts, error: previewError } = await client
        .from("people")
        .select(
          `id, firstName:first_name, lastName:last_name, updatedAt:updated_at, hasAvatar:has_avatar`,
        )
        .in("id", previewIds)
        .eq("myself", false);

      if (previewError) {
        throw internal("internal_server_error", previewError.message);
      }

      previewContactsById = new Map(
        (previewContacts || []).map((contact) => [
          contact.id,
          {
            ...contact,
            avatar: resolveContactAvatarUrl(
              client,
              userId,
              {
                hasAvatar: contact.hasAvatar,
                id: contact.id,
                updatedAt: contact.updatedAt,
              },
              avatarOptions,
            ),
          } as ContactPreview,
        ]),
      );
    }
  }

  const tagsWithCounts: TagWithCount[] = (tags || []).map((tag) => {
    const baseTag = tag as unknown as Tag;
    const pIds = includePreview ? previewMap.get(tag.id) || [] : [];
    const previewContacts = includePreview
      ? (pIds.map((id: string) => previewContactsById.get(id)).filter(Boolean) as ContactPreview[])
      : undefined;

    return {
      ...baseTag,
      contactCount: countMap.get(tag.id) || 0,
      previewContacts,
    };
  });

  return {
    tags: tagsWithCounts,
    totalCount: tagsWithCounts.length,
  };
}

export async function getTag(client: SupabaseClient<Database>, userId: string, tagId: string) {
  const { data: tag, error } = await client
    .from("tags")
    .select(TAG_SELECT)
    .eq("id", tagId)
    .eq("user_id", userId)
    .single();

  if (error) {
    throw notFound("Tag not found", "not_found");
  }

  return { tag };
}

export async function listTagMembers(
  client: SupabaseClient<Database>,
  userId: string,
  tagId: string,
  query: PeopleListQuery,
) {
  const { limit, offset } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const effectiveSort = resolveSort(query.sort, "nameAsc");
  const avatarOptions = extractAvatarOptions(query);

  const { data: tag, error: tagError } = await client
    .from("tags")
    .select("id")
    .eq("id", tagId)
    .eq("user_id", userId)
    .single();

  if (tagError || !tag) {
    throw notFound("Tag not found", "not_found");
  }

  let contacts: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    updatedAt: string;
    hasAvatar: boolean;
  }> = [];
  let totalCount = 0;

  if (search) {
    const [searchResult, countResult] = await Promise.all([
      searchPeopleIds(client, userId, search, limit, offset, { tagId }),
      countSearchPeopleIds(client, userId, search, { tagId }),
    ]);

    if (searchResult.error) {
      throw internal("internal_server_error", searchResult.error);
    }
    if (countResult.error) {
      throw internal("internal_server_error", countResult.error);
    }

    totalCount = countResult.count ?? 0;

    if (searchResult.ranked && searchResult.ranked.length > 0) {
      const rankedIds = searchResult.ranked.map((r) => r.id);
      const { data: fetchedContacts, error: fetchError } = await client
        .from("people")
        .select(
          "id, firstName:first_name, lastName:last_name, updatedAt:updated_at, hasAvatar:has_avatar",
        )
        .in("id", rankedIds)
        .eq("myself", false);

      if (fetchError) {
        throw internal("internal_server_error", fetchError.message);
      }

      contacts = restoreRankedOrder(fetchedContacts || [], rankedIds);
    }
  } else {
    let contactsQuery = client
      .from("people")
      .select(
        "id, firstName:first_name, lastName:last_name, updatedAt:updated_at, hasAvatar:has_avatar, people_tags!inner(tag_id)",
        {
          count: "exact",
        },
      )
      .eq("myself", false)
      .eq("people_tags.tag_id", tagId);

    switch (query.sort) {
      case "nameDesc":
        contactsQuery = contactsQuery.order("first_name", { ascending: false });
        break;
      case "surnameAsc":
        contactsQuery = contactsQuery.order("last_name", { ascending: true, nullsFirst: true });
        break;
      case "surnameDesc":
        contactsQuery = contactsQuery.order("last_name", { ascending: false, nullsFirst: false });
        break;
      case "interactionAsc":
        contactsQuery = contactsQuery.order("last_interaction", {
          ascending: true,
          nullsFirst: true,
        });
        break;
      case "interactionDesc":
        contactsQuery = contactsQuery.order("last_interaction", {
          ascending: false,
          nullsFirst: false,
        });
        break;
      default:
        contactsQuery = contactsQuery.order("first_name", { ascending: true });
        break;
    }

    const {
      data: contactRows,
      error: contactsError,
      count,
    } = await contactsQuery.range(offset, offset + limit - 1);

    if (contactsError) {
      throw internal("internal_server_error", contactsError.message);
    }

    contacts = (contactRows || []).map((row) => {
      const { people_tags: _pt, ...contact } = row;
      return contact;
    });
    totalCount = typeof count === "number" ? count : contacts.length;
  }

  const enrichedContacts = contacts.map((c) => ({
    ...c,
    avatar: resolveContactAvatarUrl(
      client,
      userId,
      {
        hasAvatar: c.hasAvatar,
        id: c.id,
        updatedAt: c.updatedAt,
      },
      avatarOptions,
    ),
  }));

  const pagination = buildPaginationMeta({
    itemCount: enrichedContacts.length,
    limit,
    offset,
    search,
    sort: effectiveSort,
    totalCount,
  });

  return buildPaginatedResponse("contacts", enrichedContacts, pagination);
}
