import type { Prisma } from "@bondery/db";
import type { AvatarTransformQuery } from "@bondery/schemas/http";
import type { DomainContext } from "../../domains/_shared/context.js";
import { domainDb } from "../../domains/_shared/domain-db.js";
import {
  buildPaginatedResponse,
  buildPaginationMeta,
  parsePagination,
} from "../../lib/data/pagination.js";
import { extractAvatarOptions } from "../../lib/data/select-fragments.js";
import { internal, notFound } from "../../lib/platform/errors/http-errors.js";
import { loadFormattedInteractions } from "./format.js";

export type InteractionsListQuery = AvatarTransformQuery & {
  limit?: number | string;
  offset?: number | string;
  contactId?: string;
};

type ServiceLog = {
  error: (payload: unknown, message: string) => void;
};

export async function listInteractions(
  ctx: DomainContext,
  query: InteractionsListQuery,
  log?: ServiceLog,
) {
  const db = domainDb(ctx);
  const { user } = ctx;
  const { limit, offset } = parsePagination(query);
  const avatarOptions = extractAvatarOptions(query);
  const contactId = query.contactId;

  if (contactId) {
    const person = await db.people.findFirst({
      select: { id: true },
      where: { id: contactId, userId: user.id },
    });

    if (!person) {
      throw notFound("Contact not found", "contact_not_found");
    }
  }

  const where: Prisma.InteractionWhereInput = {
    userId: user.id,
    ...(contactId ? { participants: { some: { personId: contactId } } } : {}),
  };

  let interactions: Awaited<ReturnType<typeof loadFormattedInteractions>> = [];
  let totalCount = 0;

  try {
    const [rows, count] = await Promise.all([
      db.interaction.findMany({
        orderBy: { date: "desc" },
        select: { id: true },
        skip: offset,
        take: limit,
        where,
      }),
      db.interaction.count({ where }),
    ]);

    totalCount = count;
    interactions = await loadFormattedInteractions(
      ctx,
      rows.map((row) => row.id),
      avatarOptions,
    );
  } catch (error) {
    log?.error({ err: error }, "Error fetching interactions");
    throw internal(
      "internal_server_error",
      error instanceof Error ? error.message : "Failed to fetch interactions",
    );
  }

  const pagination = buildPaginationMeta({
    itemCount: interactions.length,
    limit,
    offset,
    search: null,
    sort: "dateDesc",
    totalCount,
  });

  return buildPaginatedResponse("interactions", interactions, pagination);
}
