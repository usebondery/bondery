import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "./context.js";
import { upsertPeopleGroupMemberships } from "./people-groups.js";

function createFakeDb(params: {
  groups: Array<{ id: string; userId: string }>;
  people: Array<{ id: string; userId: string }>;
}) {
  return {
    group: {
      findFirst: async ({ where }: { where: { id: string; userId: string } }) =>
        params.groups.find((group) => group.id === where.id && group.userId === where.userId) ??
        null,
    },
    people: {
      count: async ({ where }: { where: { id: { in: string[] }; userId: string } }) =>
        params.people.filter(
          (person) => where.id.in.includes(person.id) && person.userId === where.userId,
        ).length,
    },
  };
}

describe("upsertPeopleGroupMemberships", () => {
  it("404s when any personId is foreign", async () => {
    const ctx = {
      db: createFakeDb({
        groups: [{ id: "group-1", userId: "user-a" }],
        people: [
          { id: "owned-1", userId: "user-a" },
          { id: "foreign", userId: "user-b" },
        ],
      }) as never,
      user: { email: "a@example.com", id: "user-a" },
    };

    await assert.rejects(
      () => upsertPeopleGroupMemberships(ctx, "group-1", ["owned-1", "foreign"]),
      (error: unknown) => {
        assert.ok(error instanceof DomainError);
        assert.equal(error.statusCode, 404);
        assert.equal(error.code, "contact_not_found");
        return true;
      },
    );
  });
});
