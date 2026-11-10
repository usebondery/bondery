import type { Prisma } from "@bondery/db";
import type { PeopleListQuery } from "@bondery/schemas/http";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import {
  buildPaginationMeta,
  normalizeSearch,
  parsePagination,
  resolveSort,
} from "../../lib/data/pagination.js";
import { restoreRankedOrder } from "../../lib/data/search.js";
import { countSearchPeopleIdsWithDb, searchPeopleIdsWithDb } from "../../lib/data/search-prisma.js";
import { internal } from "../../lib/platform/errors/http-errors.js";
import type { ServiceLog } from "./queries-shared.js";

export type PeoplePageRow = {
  id: string;
  hasAvatar: boolean;
  updatedAt?: string;
  [key: string]: unknown;
};

export type QueryPeoplePageResult = {
  rows: PeoplePageRow[];
  count: number | null;
};

type ContactListContext = Pick<DomainContext, "db" | "user"> & { log?: ServiceLog };

/**
 * Orders the people list for one page request.
 *
 * `id` is the last key so the order is total. Without it, rows that share the
 * sort value can swap places between two `skip`/`take` queries, so one row
 * appears on both pages and another is never returned.
 */
function peopleListOrderBy(sort: PeopleListQuery["sort"]): Prisma.PeopleOrderByWithRelationInput[] {
  switch (sort) {
    case "nameDesc":
      return [{ firstName: "desc" }, { id: "asc" }];
    case "surnameAsc":
      return [{ lastName: { nulls: "first", sort: "asc" } }, { id: "asc" }];
    case "surnameDesc":
      return [{ lastName: { nulls: "last", sort: "desc" } }, { id: "asc" }];
    case "interactionAsc":
      return [{ lastInteraction: { nulls: "first", sort: "asc" } }, { id: "asc" }];
    case "interactionDesc":
      return [{ lastInteraction: { nulls: "last", sort: "desc" } }, { id: "asc" }];
    case "createdAtAsc":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "createdAtDesc":
      return [{ createdAt: "desc" }, { id: "asc" }];
    default:
      return [{ firstName: "asc" }, { id: "asc" }];
  }
}

export async function queryPeoplePage<S extends Prisma.PeopleSelect>(
  ctx: ContactListContext,
  query: PeopleListQuery,
  config: {
    select: S;
    map: (row: Prisma.PeopleGetPayload<{ select: S }>) => PeoplePageRow;
  },
  log?: ServiceLog,
): Promise<QueryPeoplePageResult> {
  const { user } = ctx;
  const db = domainDb(ctx as DomainContext);
  const { limit, offset } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const keepInTouch = Boolean(query.keepInTouch);
  const tagIds = query.tag_ids && query.tag_ids.length > 0 ? query.tag_ids : undefined;

  const baseWhere: Prisma.PeopleWhereInput = {
    myself: false,
    userId: user.id,
    ...(keepInTouch ? { keepFrequencyDays: { not: null } } : {}),
    // OR semantics: a contact matches when it has any selected tag.
    ...(tagIds ? { tags: { some: { tagId: { in: tagIds } } } } : {}),
  };

  if (search) {
    const [searchResult, countResult] = await Promise.all([
      searchPeopleIdsWithDb(db, user.id, search, limit, offset, { keepInTouch, tagIds }),
      countSearchPeopleIdsWithDb(db, user.id, search, { keepInTouch, tagIds }),
    ]);

    if (searchResult.error) {
      log?.error({ err: searchResult.error }, "Error in fuzzy search RPC");
      throw internal("internal_server_error", searchResult.error);
    }

    if (countResult.error) {
      log?.error({ err: countResult.error }, "Error in fuzzy search count RPC");
      throw internal("internal_server_error", countResult.error);
    }

    const count = countResult.count ?? 0;

    if (!searchResult.ranked || searchResult.ranked.length === 0) {
      return { count, rows: [] };
    }

    const rankedIds = searchResult.ranked.map((r) => r.id);
    const fetchedContacts = await db.people.findMany({
      select: config.select,
      where: {
        id: { in: rankedIds },
        myself: false,
        userId: user.id,
      },
    });

    const normalized = fetchedContacts.map(config.map);
    const rows = restoreRankedOrder(normalized, rankedIds);
    return { count, rows };
  }

  const contactRows = await db.people.findMany({
    orderBy: peopleListOrderBy(query.sort),
    select: config.select,
    skip: offset,
    take: limit,
    where: baseWhere,
  });
  const count = await db.people.count({ where: baseWhere });

  return {
    count,
    rows: contactRows.map(config.map),
  };
}

export function buildPeopleListPagination(
  query: PeopleListQuery,
  itemCount: number,
  totalCount: number | null,
) {
  const { limit, offset } = parsePagination(query);
  const search = normalizeSearch(query.search);
  const effectiveSort = resolveSort(query.sort, "nameAsc");

  return buildPaginationMeta({
    itemCount,
    limit,
    offset,
    search,
    sort: effectiveSort,
    totalCount: typeof totalCount === "number" ? totalCount : itemCount,
  });
}
