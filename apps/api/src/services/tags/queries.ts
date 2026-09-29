import type { Prisma } from "@bondery/db";
import type { ContactPreview, Tag, TagWithCount } from "@bondery/schemas";
import type { AvatarTransformQuery, PeopleListQuery } from "@bondery/schemas/http";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { toTagDto } from "../../domains/_shared/prisma-helpers.js";
import {
  buildPaginatedResponse,
  buildPaginationMeta,
  normalizeSearch,
  parsePagination,
  resolveSort,
} from "../../lib/data/pagination.js";
import { restoreRankedOrder } from "../../lib/data/search.js";
import { countSearchPeopleIdsWithDb, searchPeopleIdsWithDb } from "../../lib/data/search-prisma.js";
import { extractAvatarOptions } from "../../lib/data/select-fragments.js";
import { internal, notFound } from "../../lib/platform/errors/http-errors.js";
import { resolveContactAvatarUrl } from "../../lib/storage/avatar-urls.js";

export type PreviewListQuery = AvatarTransformQuery & {
  previewLimit?: number | string;
};

type TagListContext = Pick<DomainContext, "db" | "user">;

function peopleListOrderBy(sort: PeopleListQuery["sort"]): Prisma.PeopleOrderByWithRelationInput {
  switch (sort) {
    case "nameDesc":
      return { firstName: "desc" };
    case "surnameAsc":
      return { lastName: { nulls: "first", sort: "asc" } };
    case "surnameDesc":
      return { lastName: { nulls: "last", sort: "desc" } };
    case "interactionAsc":
      return { lastInteraction: { nulls: "first", sort: "asc" } };
    case "interactionDesc":
      return { lastInteraction: { nulls: "last", sort: "desc" } };
    default:
      return { firstName: "asc" };
  }
}

export async function listTags(ctx: TagListContext, query?: PreviewListQuery) {
  const { user } = ctx;
  const db = domainDb(ctx as DomainContext);
  const previewLimitRaw = query?.previewLimit;
  const previewLimit = previewLimitRaw ? Number(previewLimitRaw) : 3;
  const includePreview = previewLimit > 0;
  const avatarOptions = extractAvatarOptions(query ?? {});

  const tagRows = await db.tag.findMany({
    orderBy: { label: "asc" },
    where: { userId: user.id },
  });

  const memberships = await db.peopleTag.findMany({
    select: { personId: true, tagId: true },
    where: { userId: user.id },
  });

  const countMap = new Map<string, number>();
  const previewMap = new Map<string, string[]>();

  for (const item of memberships) {
    const current = countMap.get(item.tagId) ?? 0;
    countMap.set(item.tagId, current + 1);

    if (!includePreview) {
      continue;
    }

    const existing = previewMap.get(item.tagId) ?? [];
    if (existing.length < previewLimit) {
      existing.push(item.personId);
      previewMap.set(item.tagId, existing);
    }
  }

  let previewContactsById = new Map<string, ContactPreview>();

  if (includePreview) {
    const previewIds = [...new Set(Array.from(previewMap.values()).flat())];

    if (previewIds.length > 0) {
      const previewContacts = await db.people.findMany({
        select: {
          firstName: true,
          hasAvatar: true,
          id: true,
          lastName: true,
          updatedAt: true,
        },
        where: {
          id: { in: previewIds },
          myself: false,
          userId: user.id,
        },
      });

      previewContactsById = new Map(
        previewContacts.map((contact) => [
          contact.id,
          {
            avatar: resolveContactAvatarUrl(
              user.id,
              {
                hasAvatar: contact.hasAvatar,
                id: contact.id,
                updatedAt: contact.updatedAt.toISOString(),
              },
              avatarOptions,
            ),
            firstName: contact.firstName,
            hasAvatar: contact.hasAvatar,
            id: contact.id,
            lastName: contact.lastName,
            updatedAt: contact.updatedAt.toISOString(),
          } as ContactPreview,
        ]),
      );
    }
  }

  const tagsWithCounts: TagWithCount[] = tagRows.map((row) => {
    const baseTag = toTagDto(row);
    const pIds = includePreview ? (previewMap.get(row.id) ?? []) : [];
    const previewContacts = includePreview
      ? (pIds.map((id) => previewContactsById.get(id)).filter(Boolean) as ContactPreview[])
      : undefined;

    return {
      ...baseTag,
      contactCount: countMap.get(row.id) ?? 0,
      previewContacts,
    };
  });

  return {
    tags: tagsWithCounts,
    totalCount: tagsWithCounts.length,
  };
}

export async function getTag(ctx: TagListContext, tagId: string) {
  const { user } = ctx;
  const db = domainDb(ctx as DomainContext);
  const row = await db.tag.findFirst({
    where: { id: tagId, userId: user.id },
  });

  if (!row) {
    throw notFound("Tag not found", "tag_not_found");
  }

  return { tag: toTagDto(row) as Tag };
}

export async function listTagMembers(ctx: TagListContext, tagId: string, query: PeopleListQuery) {
  const { user } = ctx;
  const db = domainDb(ctx as DomainContext);
  const { limit, offset } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const effectiveSort = resolveSort(query.sort, "nameAsc");
  const avatarOptions = extractAvatarOptions(query);

  const tag = await db.tag.findFirst({
    select: { id: true },
    where: { id: tagId, userId: user.id },
  });

  if (!tag) {
    throw notFound("Tag not found", "tag_not_found");
  }

  const memberWhere: Prisma.PeopleWhereInput = {
    myself: false,
    tags: { some: { tagId } },
    userId: user.id,
  };

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
      searchPeopleIdsWithDb(db, user.id, search, limit, offset, { tagId }),
      countSearchPeopleIdsWithDb(db, user.id, search, { tagId }),
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
      const fetchedContacts = await db.people.findMany({
        select: {
          firstName: true,
          hasAvatar: true,
          id: true,
          lastName: true,
          updatedAt: true,
        },
        where: {
          id: { in: rankedIds },
          myself: false,
          userId: user.id,
        },
      });

      const normalized = fetchedContacts.map((row) => ({
        firstName: row.firstName,
        hasAvatar: row.hasAvatar,
        id: row.id,
        lastName: row.lastName,
        updatedAt: row.updatedAt.toISOString(),
      }));

      contacts = restoreRankedOrder(normalized, rankedIds);
    }
  } else {
    const [contactRows, count] = await Promise.all([
      db.people.findMany({
        orderBy: peopleListOrderBy(query.sort),
        select: {
          firstName: true,
          hasAvatar: true,
          id: true,
          lastName: true,
          updatedAt: true,
        },
        skip: offset,
        take: limit,
        where: memberWhere,
      }),
      db.people.count({ where: memberWhere }),
    ]);

    contacts = contactRows.map((row) => ({
      firstName: row.firstName,
      hasAvatar: row.hasAvatar,
      id: row.id,
      lastName: row.lastName,
      updatedAt: row.updatedAt.toISOString(),
    }));
    totalCount = count;
  }

  const enrichedContacts = contacts.map((c) => ({
    ...c,
    avatar: resolveContactAvatarUrl(
      user.id,
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
