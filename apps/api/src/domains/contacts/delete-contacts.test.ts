import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deleteContacts } from "./delete-contacts.js";

type Person = { id: string; myself: boolean; userId: string };

function createFakeDb(people: Person[]) {
  const deleteManyCalls: Array<{ id: { in: string[] }; myself: boolean; userId: string }> = [];
  return {
    db: {
      people: {
        deleteMany: async ({
          where,
        }: {
          where: { id: { in: string[] }; myself: boolean; userId: string };
        }) => {
          deleteManyCalls.push(where);
          const matched = people.filter(
            (person) =>
              where.id.in.includes(person.id) &&
              person.userId === where.userId &&
              person.myself === where.myself,
          );
          return { count: matched.length };
        },
        findMany: async ({
          where,
        }: {
          where: { id: { in: string[] }; myself?: boolean; userId: string };
        }) =>
          people.filter((person) => {
            if (!where.id.in.includes(person.id) || person.userId !== where.userId) {
              return false;
            }
            if (where.myself !== undefined && person.myself !== where.myself) {
              return false;
            }
            return true;
          }),
      },
    },
    deleteManyCalls,
  };
}

describe("deleteContacts", () => {
  it("succeeds when the batch includes myself and does not delete that card", async () => {
    const { db, deleteManyCalls } = createFakeDb([
      { id: "myself", myself: true, userId: "user-a" },
      { id: "foreign", myself: false, userId: "user-b" },
    ]);
    const result = await deleteContacts(
      { db: db as never, user: { email: "a@example.com", id: "user-a" } },
      ["myself", "foreign"],
    );

    assert.equal(result.data.deletedCount, 0);
    assert.equal(deleteManyCalls.length, 0);
  });
});
