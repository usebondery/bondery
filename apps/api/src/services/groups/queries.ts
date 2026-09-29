import type { Prisma } from "@bondery/db";
import {
  type ContactPreview,
  contactListItemSchema,
  type Group,
  type GroupWithCount,
} from "@bondery/schemas";
import type { AvatarTransformQuery, PeopleListQuery } from "@bondery/schemas/http";
import { z } from "zod";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { toGroupDto } from "../../domains/_shared/prisma-helpers.js";
import { attachContactExtras } from "../../lib/contacts/enrichment.js";
import {
  buildPaginatedResponse,
  buildPaginationMeta,
  normalizeSearch,
  parsePagination,
  resolveSort,
} from "../../lib/data/pagination.js";
import { contactListSelect, mapContactListRecord } from "../../lib/data/prisma-mappers.js";
import { restoreRankedOrder } from "../../lib/data/search.js";
import { countSearchPeopleIdsWithDb, searchPeopleIdsWithDb } from "../../lib/data/search-prisma.js";
import { extractAvatarOptions } from "../../lib/data/select-fragments.js";
import { internal, notFound } from "../../lib/platform/errors/http-errors.js";
import { resolveContactAvatarUrl } from "../../lib/storage/avatar-urls.js";

export type PreviewListQuery = AvatarTransformQuery & {
  previewLimit?: number | string;
};

type GroupListContext = Pick<DomainContext, "db" | "log" | "user">;

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

export async function listGroups(ctx: GroupListContext, query?: PreviewListQuery) {
  const { user } = ctx;
  const db = domainDb(ctx as DomainContext);
  const previewLimitRaw = query?.previewLimit;
  const previewLimit = previewLimitRaw ? Number(previewLimitRaw) : undefined;
  const includePreview = Number.isFinite(previewLimit) && (previewLimit as number) > 0;
  const avatarOptions = extractAvatarOptions(query ?? {});

  const groupRows = await db.group.findMany({
    orderBy: { label: "asc" },
    where: { userId: user.id },
  });

  const memberships = await db.peopleGroup.findMany({
    select: { groupId: true, personId: true },
    where: { userId: user.id },
  });

  const countMap = new Map<string, number>();
  const previewMap = new Map<string, string[]>();

  for (const item of memberships) {
    const current = countMap.get(item.groupId) ?? 0;
    countMap.set(item.groupId, current + 1);

    if (!includePreview) {
      continue;
    }

    const existing = previewMap.get(item.groupId) ?? [];
    if (existing.length < (previewLimit as number)) {
      existing.push(item.personId);
      previewMap.set(item.groupId, existing);
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

  const groupsWithCounts: GroupWithCount[] = groupRows.map((row) => {
    const baseGroup = toGroupDto(row);
    const previewIds = includePreview ? (previewMap.get(row.id) ?? []) : [];
    const previewContacts = includePreview
      ? (previewIds.map((id) => previewContactsById.get(id)).filter(Boolean) as ContactPreview[])
      : undefined;

    return {
      ...baseGroup,
      contactCount: countMap.get(row.id) ?? 0,
      previewContacts,
    };
  });

  return {
    groups: groupsWithCounts,
    totalCount: groupsWithCounts.length,
  };
}

export async function getGroup(ctx: GroupListContext, groupId: string) {
  const { user } = ctx;
  const db = domainDb(ctx as DomainContext);
  const row = await db.group.findFirst({
    where: { id: groupId, userId: user.id },
  });

  if (!row) {
    throw notFound("Group not found", "group_not_found");
  }

  return { group: toGroupDto(row) as Group };
}

export async function listGroupMembers(
  ctx: GroupListContext,
  groupId: string,
  query: PeopleListQuery,
) {
  const { log, user } = ctx;
  const db = domainDb(ctx as DomainContext);
  const { limit, offset } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const effectiveSort = resolveSort(query.sort, "nameAsc");
  const avatarOptions = extractAvatarOptions(query);

  const group = await db.group.findFirst({
    select: { id: true, label: true },
    where: { id: groupId, userId: user.id },
  });

  if (!group) {
    throw notFound("Group not found", "group_not_found");
  }

  const memberWhere: Prisma.PeopleWhereInput = {
    groups: { some: { groupId } },
    myself: false,
    userId: user.id,
  };

  let contacts = [] as ReturnType<typeof mapContactListRecord>[];
  let totalCount = 0;

  if (search) {
    const [searchResult, countResult] = await Promise.all([
      searchPeopleIdsWithDb(db, user.id, search, limit, offset, { groupId }),
      countSearchPeopleIdsWithDb(db, user.id, search, { groupId }),
    ]);

    if (searchResult.error) {
      log?.error({ rpcError: searchResult.error }, "Error in fuzzy search RPC for group contacts");
      throw internal("internal_server_error", searchResult.error);
    }

    if (countResult.error) {
      log?.error(
        { rpcError: countResult.error },
        "Error in fuzzy search count RPC for group contacts",
      );
      throw internal("internal_server_error", countResult.error);
    }

    totalCount = countResult.count ?? 0;

    if (searchResult.ranked && searchResult.ranked.length > 0) {
      const rankedIds = searchResult.ranked.map((r) => r.id);
      const fetchedContacts = await db.people.findMany({
        select: contactListSelect,
        where: {
          id: { in: rankedIds },
          myself: false,
          userId: user.id,
        },
      });

      const normalized = fetchedContacts.map(mapContactListRecord);
      contacts = restoreRankedOrder(normalized, rankedIds);
    }
  } else {
    const [contactRows, count] = await Promise.all([
      db.people.findMany({
        orderBy: peopleListOrderBy(query.sort),
        select: contactListSelect,
        skip: offset,
        take: limit,
        where: memberWhere,
      }),
      db.people.count({ where: memberWhere }),
    ]);

    contacts = contactRows.map(mapContactListRecord);
    totalCount = count;
  }

  let enrichedContacts = contacts;
  try {
    enrichedContacts = await attachContactExtras(db, user.id, contacts, {
      addresses: true,
      avatarOptions,
    });
  } catch (error) {
    log?.error({ err: error }, "Failed to attach contact channels/social media for group contacts");
    enrichedContacts = contacts.map((contact) => ({
      ...contact,
      addresses: [],
      avatar: null,
      emails: [],
      facebook: null,
      instagram: null,
      linkedin: null,
      phones: [],
      signal: null,
      website: null,
      whatsapp: null,
    }));
  }

  const pagination = buildPaginationMeta({
    itemCount: enrichedContacts.length,
    limit,
    offset,
    search,
    sort: effectiveSort,
    totalCount,
  });

  return {
    group: { id: group.id, label: group.label },
    ...buildPaginatedResponse(
      "contacts",
      z.array(contactListItemSchema).parse(enrichedContacts),
      pagination,
    ),
  };
}
