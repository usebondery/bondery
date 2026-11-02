import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Prisma } from "@bondery/db";
import { buildInteractionListWhere } from "./list-where.js";

const USER_ID = "user-1";

function searchOr(where: Prisma.InteractionWhereInput): Prisma.InteractionWhereInput[] {
  const and = where.AND;
  assert.ok(Array.isArray(and));
  const clause = and.find((entry) => entry.OR);
  assert.ok(clause?.OR);
  return clause.OR;
}

describe("buildInteractionListWhere", () => {
  it("matches networking on type, title, description, and participant names", () => {
    const where = buildInteractionListWhere({
      contactId: "person-1",
      search: "networking",
      userId: USER_ID,
    });

    assert.equal(where.userId, USER_ID);
    const and = where.AND;
    assert.ok(Array.isArray(and));
    assert.deepEqual(and[0], { participants: { some: { personId: "person-1" } } });

    const match = { contains: "networking", mode: "insensitive" as const };
    assert.deepEqual(searchOr(where), [
      { type: match },
      { title: match },
      { description: match },
      {
        participants: {
          some: {
            person: {
              OR: [{ firstName: match }, { lastName: match }, { middleName: match }],
              userId: USER_ID,
            },
          },
        },
      },
    ]);
  });

  it("keeps one substring and inclusive date bounds", () => {
    const start = "2026-06-15T00:00:00.000Z";
    const end = "2026-06-15T21:59:59.999Z";
    const where = buildInteractionListWhere({
      end_date: end,
      search: "networking event",
      start_date: start,
      userId: USER_ID,
    });

    assert.deepEqual(searchOr(where)[0], {
      type: { contains: "networking event", mode: "insensitive" },
    });

    const and = where.AND;
    assert.ok(Array.isArray(and));
    const dateClause = and.find((entry) => entry.date);
    assert.deepEqual(dateClause, {
      date: {
        gte: new Date(start),
        lte: new Date(end),
      },
    });
  });
});
