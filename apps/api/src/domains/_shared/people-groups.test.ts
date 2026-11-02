import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

import { prisma } from "@bondery/db";

import { loadTestEnv } from "../../test/load-test-env.js";
import { DomainError } from "./context.js";
import { removePeopleGroupMemberships, upsertPeopleGroupMemberships } from "./people-groups.js";

loadTestEnv();

function createCtx(userId: string) {
  return {
    db: prisma,
    user: { email: `people-groups-${userId}@example.test`, id: userId },
  };
}

/** Creates an isolated user with one group and two contacts, then removes them after the suite. */
async function seed() {
  const userId = randomUUID();
  const ctx = createCtx(userId);

  await prisma.user.create({ data: { email: ctx.user.email, id: userId } });

  const group = await prisma.group.create({
    data: { color: "#3B82F6", emoji: "🧪", id: randomUUID(), label: "probe-group", userId },
  });
  const [firstPerson, secondPerson] = await Promise.all([
    prisma.people.create({ data: { firstName: "Probe", id: randomUUID(), userId } }),
    prisma.people.create({ data: { firstName: "Probe", id: randomUUID(), userId } }),
  ]);

  return {
    cleanup: () => prisma.user.deleteMany({ where: { id: userId } }),
    ctx,
    firstPersonId: firstPerson.id,
    groupId: group.id,
    secondPersonId: secondPerson.id,
  };
}

describe("upsertPeopleGroupMemberships", () => {
  let seeded: Awaited<ReturnType<typeof seed>>;

  before(async () => {
    seeded = await seed();
  });

  after(async () => {
    await seeded.cleanup();
  });

  it("404s when any personId is foreign", async () => {
    const foreignUserId = randomUUID();
    await prisma.user.create({
      data: { email: `people-groups-foreign-${foreignUserId}@example.test`, id: foreignUserId },
    });
    const foreignPerson = await prisma.people.create({
      data: { firstName: "Foreign", id: randomUUID(), userId: foreignUserId },
    });

    try {
      await assert.rejects(
        () =>
          upsertPeopleGroupMemberships(seeded.ctx, seeded.groupId, [
            seeded.firstPersonId,
            foreignPerson.id,
          ]),
        (error: unknown) => {
          assert.ok(error instanceof DomainError);
          assert.equal(error.statusCode, 404);
          assert.equal(error.code, "contact_not_found");
          return true;
        },
      );
    } finally {
      await prisma.user.deleteMany({ where: { id: foreignUserId } });
    }
  });

  it("counts only new memberships and reports the rest as skipped", async () => {
    const result = await upsertPeopleGroupMemberships(seeded.ctx, seeded.groupId, [
      seeded.firstPersonId,
      seeded.secondPersonId,
    ]);

    assert.equal(result.addedCount, 2);
    assert.equal(result.skippedCount, 0);
  });

  it("skips memberships that already exist", async () => {
    const result = await upsertPeopleGroupMemberships(seeded.ctx, seeded.groupId, [
      seeded.firstPersonId,
      seeded.secondPersonId,
    ]);

    assert.equal(result.addedCount, 0);
    assert.equal(result.skippedCount, 2);
  });
});

describe("removePeopleGroupMemberships", () => {
  let seeded: Awaited<ReturnType<typeof seed>>;

  before(async () => {
    seeded = await seed();
  });

  after(async () => {
    await seeded.cleanup();
  });

  it("removes the memberships and reports the requested count", async () => {
    await upsertPeopleGroupMemberships(seeded.ctx, seeded.groupId, [
      seeded.firstPersonId,
      seeded.secondPersonId,
    ]);

    const result = await removePeopleGroupMemberships(seeded.ctx, seeded.groupId, [
      seeded.firstPersonId,
      seeded.secondPersonId,
    ]);

    assert.equal(result.removedCount, 2);

    const remaining = await prisma.peopleGroup.count({
      where: { groupId: seeded.groupId, userId: seeded.ctx.user.id },
    });
    assert.equal(remaining, 0);
  });
});
