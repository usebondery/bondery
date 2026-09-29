import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "./context.js";
import { upsertPeopleTagMemberships } from "./people-tags.js";

function createFakeDb(params: {
  tags: Array<{ id: string; userId: string }>;
  people: Array<{ id: string; userId: string }>;
}) {
  return {
    people: {
      count: async ({ where }: { where: { id: { in: string[] }; userId: string } }) =>
        params.people.filter(
          (person) => where.id.in.includes(person.id) && person.userId === where.userId,
        ).length,
    },
    tag: {
      findFirst: async ({ where }: { where: { id: string; userId: string } }) =>
        params.tags.find((tag) => tag.id === where.id && tag.userId === where.userId) ?? null,
    },
  };
}

describe("upsertPeopleTagMemberships", () => {
  it("404s when any personId is foreign", async () => {
    const ctx = {
      db: createFakeDb({
        people: [
          { id: "owned-1", userId: "user-a" },
          { id: "foreign", userId: "user-b" },
        ],
        tags: [{ id: "tag-1", userId: "user-a" }],
      }) as never,
      user: { email: "a@example.com", id: "user-a" },
    };

    await assert.rejects(
      () => upsertPeopleTagMemberships(ctx, "tag-1", ["owned-1", "foreign"]),
      (error: unknown) => {
        assert.ok(error instanceof DomainError);
        assert.equal(error.statusCode, 404);
        assert.equal(error.code, "contact_not_found");
        return true;
      },
    );
  });
});
