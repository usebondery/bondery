import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "../../domains/_shared/context.js";
import { createInteraction, deleteInteraction, updateInteraction } from "./index.js";

const ISO_DATE = "2026-03-01T00:00:00.000Z";

function createFakeDb(params: {
  people: Array<{ id: string; userId: string }>;
  interactions: Array<{
    date: Date;
    id: string;
    title: string | null;
    type: string;
    userId: string;
  }>;
  updateManyCount?: number;
  deleteManyCount?: number;
}) {
  const updateManyWheres: Array<{ id: string; userId: string }> = [];
  const deleteManyWheres: Array<{ id: string; userId: string }> = [];
  return {
    db: {
      interaction: {
        deleteMany: async ({ where }: { where: { id: string; userId: string } }) => {
          deleteManyWheres.push(where);
          return { count: params.deleteManyCount ?? 0 };
        },
        findFirst: async ({ where }: { where: { id: string; userId: string } }) =>
          params.interactions.find(
            (interaction) => interaction.id === where.id && interaction.userId === where.userId,
          ) ?? null,
        updateMany: async ({ where }: { where: { id: string; userId: string } }) => {
          updateManyWheres.push(where);
          return { count: params.updateManyCount ?? 0 };
        },
      },
      interactionParticipant: {
        deleteMany: async () => ({ count: 0 }),
      },
      people: {
        count: async ({ where }: { where: { id: { in: string[] }; userId: string } }) =>
          params.people.filter(
            (person) => where.id.in.includes(person.id) && person.userId === where.userId,
          ).length,
      },
    },
    deleteManyWheres,
    updateManyWheres,
  };
}

describe("interaction ownership", () => {
  const userId = "user-a";
  const ownedInteraction = {
    date: new Date(ISO_DATE),
    id: "int-owned",
    title: "Coffee",
    type: "Coffee",
    userId,
  };

  it("404s createInteraction when a participant is foreign", async () => {
    const { db } = createFakeDb({
      interactions: [],
      people: [
        { id: "owned-1", userId },
        { id: "foreign", userId: "user-b" },
      ],
    });

    await assert.rejects(
      () =>
        createInteraction(
          { db: db as never, user: { email: "a@example.com", id: userId } },
          {
            date: ISO_DATE,
            participantIds: ["owned-1", "foreign"],
            type: "Call",
          },
        ),
      (error: unknown) => {
        assert.ok(error instanceof DomainError);
        assert.equal(error.statusCode, 404);
        assert.equal(error.code, "contact_not_found");
        return true;
      },
    );
  });

  it("404s updateInteraction for a foreign id", async () => {
    const { db, updateManyWheres } = createFakeDb({
      interactions: [ownedInteraction],
      people: [],
    });

    await assert.rejects(
      () =>
        updateInteraction(
          { db: db as never, user: { email: "a@example.com", id: "user-b" } },
          ownedInteraction.id,
          { title: "Hijack" },
        ),
      (error: unknown) => {
        assert.ok(error instanceof DomainError);
        assert.equal(error.statusCode, 404);
        assert.equal(error.code, "interaction_not_found");
        return true;
      },
    );
    assert.equal(updateManyWheres.length, 0);
  });

  it("404s updateInteraction when updateMany matches zero rows", async () => {
    const { db, updateManyWheres } = createFakeDb({
      interactions: [ownedInteraction],
      people: [],
      updateManyCount: 0,
    });

    await assert.rejects(
      () =>
        updateInteraction(
          { db: db as never, user: { email: "a@example.com", id: userId } },
          ownedInteraction.id,
          { title: "Follow-up" },
        ),
      (error: unknown) => {
        assert.ok(error instanceof DomainError);
        assert.equal(error.statusCode, 404);
        assert.equal(error.code, "interaction_not_found");
        return true;
      },
    );
    assert.deepEqual(updateManyWheres, [{ id: ownedInteraction.id, userId }]);
  });

  it("404s deleteInteraction for a foreign id", async () => {
    const { db, deleteManyWheres } = createFakeDb({
      interactions: [ownedInteraction],
      people: [],
    });

    await assert.rejects(
      () =>
        deleteInteraction(
          { db: db as never, user: { email: "a@example.com", id: "user-b" } },
          ownedInteraction.id,
        ),
      (error: unknown) => {
        assert.ok(error instanceof DomainError);
        assert.equal(error.statusCode, 404);
        assert.equal(error.code, "interaction_not_found");
        return true;
      },
    );
    assert.equal(deleteManyWheres.length, 0);
  });

  it("404s deleteInteraction when deleteMany matches zero rows", async () => {
    const { db, deleteManyWheres } = createFakeDb({
      deleteManyCount: 0,
      interactions: [ownedInteraction],
      people: [],
    });

    await assert.rejects(
      () =>
        deleteInteraction(
          { db: db as never, user: { email: "a@example.com", id: userId } },
          ownedInteraction.id,
        ),
      (error: unknown) => {
        assert.ok(error instanceof DomainError);
        assert.equal(error.statusCode, 404);
        assert.equal(error.code, "interaction_not_found");
        return true;
      },
    );
    assert.deepEqual(deleteManyWheres, [{ id: ownedInteraction.id, userId }]);
  });
});
