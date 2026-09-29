import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertOwnedPersonIds } from "./assert-owned-person-ids.js";
import { DomainError } from "./context.js";

function createFakeDb(people: Array<{ id: string; userId: string }>) {
  return {
    people: {
      count: async ({ where }: { where: { id: { in: string[] }; userId: string } }) =>
        people.filter((person) => where.id.in.includes(person.id) && person.userId === where.userId)
          .length,
    },
  };
}

describe("assertOwnedPersonIds", () => {
  const userId = "user-a";
  const ctx = {
    db: createFakeDb([
      { id: "owned-1", userId },
      { id: "owned-2", userId },
      { id: "foreign", userId: "user-b" },
    ]) as never,
    user: { email: "a@example.com", id: userId },
  };

  it("allows an empty list", async () => {
    await assertOwnedPersonIds(ctx, []);
  });

  it("allows ids that all belong to the caller", async () => {
    await assertOwnedPersonIds(ctx, ["owned-1", "owned-2", "owned-1"]);
  });

  it("404s when any id is foreign", async () => {
    await assert.rejects(
      () => assertOwnedPersonIds(ctx, ["owned-1", "foreign"]),
      (error: unknown) => {
        assert.ok(error instanceof DomainError);
        assert.equal(error.statusCode, 404);
        assert.equal(error.code, "contact_not_found");
        return true;
      },
    );
  });

  it("404s when any id is missing", async () => {
    await assert.rejects(
      () => assertOwnedPersonIds(ctx, ["owned-1", "missing"]),
      (error: unknown) => {
        assert.ok(error instanceof DomainError);
        assert.equal(error.statusCode, 404);
        return true;
      },
    );
  });
});
