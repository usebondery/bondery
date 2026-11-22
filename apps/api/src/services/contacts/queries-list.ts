import { contactListItemSchema } from "@bondery/schemas";
import type { PeopleListQuery } from "@bondery/schemas/http";
import { z } from "zod";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import { attachContactExtras } from "../../lib/contacts/enrichment.js";
import { buildPaginatedResponse } from "../../lib/data/pagination.js";
import { contactListSelect, mapContactListRecord } from "../../lib/data/prisma-mappers.js";
import { extractAvatarOptions } from "../../lib/data/select-fragments.js";
import type { ServiceLog } from "./queries-shared.js";
import { buildPeopleListPagination, queryPeoplePage } from "./query-people-page.js";

type ContactListContext = Pick<DomainContext, "db" | "user"> & { log?: ServiceLog };

export async function listContacts(ctx: ContactListContext, query: PeopleListQuery) {
  const { log, user } = ctx;
  const db = domainDb(ctx as DomainContext);
  const avatarOptions = extractAvatarOptions(query);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const nextYearStart = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));

  const [totalContactsCount, monthInteractionsCount, newContactsYearCount, page] =
    await Promise.all([
      db.people.count({
        where: { myself: false, userId: user.id },
      }),
      db.interaction.count({
        where: {
          date: { gte: monthStart, lt: nextMonthStart },
          userId: user.id,
        },
      }),
      db.people.count({
        where: {
          createdAt: { gte: yearStart, lt: nextYearStart },
          myself: false,
          userId: user.id,
        },
      }),
      queryPeoplePage(ctx, query, { map: mapContactListRecord, select: contactListSelect }, log),
    ]);

  const enrichedContacts = await attachContactExtras(db, user.id, page.rows, {
    addresses: true,
    avatarOptions,
  });

  const pagination = buildPeopleListPagination(query, enrichedContacts.length, page.count);

  return {
    ...buildPaginatedResponse(
      "contacts",
      z.array(contactListItemSchema).parse(enrichedContacts),
      pagination,
    ),
    stats: {
      newContactsThisYear: newContactsYearCount,
      thisMonthInteractions: monthInteractionsCount,
      totalContacts: totalContactsCount,
    },
  };
}
