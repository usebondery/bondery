/**
 * Reviewer access revocation against real Postgres.
 *
 * Revoking a grant must end live access, not just future magic links. Better
 * Auth enforces `user.banned` in `session.create.before`, so the ban covers
 * GitHub, passkey, magic link, and refresh-token sign-in.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import { generateId } from "@bondery/helpers/ids";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const { revokeEndedReviewerGrants, revokeReviewerGrant } = await import(
  "../lib/bootstrap/revoke-expired-reviewers.js"
);

describe("reviewer access revocation", () => {
  const createdUserIds: string[] = [];
  const createdReviewerAccessIds: string[] = [];

  async function seedGrant(options: {
    email: string;
    expiresAt: Date;
    revokedAt?: Date | null;
  }): Promise<{ reviewerAccessId: string; userId: string }> {
    const userId = generateId();
    await prisma.user.create({
      data: { email: options.email, emailVerified: true, id: userId, name: "Reviewer" },
    });
    createdUserIds.push(userId);

    const grant = await prisma.reviewerAccess.create({
      data: {
        createdBy: "test",
        email: options.email,
        expiresAt: options.expiresAt,
        id: generateId(),
        label: "Anthropic",
        revokedAt: options.revokedAt ?? null,
        userId,
      },
    });
    createdReviewerAccessIds.push(grant.id);

    return { reviewerAccessId: grant.id, userId };
  }

  async function seedSession(userId: string): Promise<string> {
    const sessionId = generateId();
    await prisma.session.create({
      data: {
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        id: sessionId,
        token: `test-${sessionId}`,
        userId,
      },
    });
    return sessionId;
  }

  before(() => {
    assert.ok(prisma, "prisma client required");
  });

  after(async () => {
    if (createdReviewerAccessIds.length > 0) {
      await prisma.reviewerAccess.deleteMany({ where: { id: { in: createdReviewerAccessIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.session.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  it("revokes one grant, bans the user, and drops sessions", async () => {
    const { reviewerAccessId, userId } = await seedGrant({
      email: `revoke-one-${generateId()}@example.test`,
      expiresAt: new Date(Date.now() + 60_000),
    });
    await seedSession(userId);

    const result = await revokeReviewerGrant(reviewerAccessId);
    assert.ok(result);
    assert.equal(result.userId, userId);

    const user = await prisma.user.findUnique({ select: { banned: true }, where: { id: userId } });
    assert.equal(user?.banned, true);

    const grant = await prisma.reviewerAccess.findUnique({
      select: { revokedAt: true },
      where: { id: reviewerAccessId },
    });
    assert.ok(grant?.revokedAt);

    const sessions = await prisma.session.count({ where: { userId } });
    assert.equal(sessions, 0);
  });

  it("sweeps expired grants only", async () => {
    const expired = await seedGrant({
      email: `revoke-expired-${generateId()}@example.test`,
      expiresAt: new Date(Date.now() - 60_000),
    });
    const active = await seedGrant({
      email: `revoke-active-${generateId()}@example.test`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await seedSession(expired.userId);
    await seedSession(active.userId);

    await revokeEndedReviewerGrants();

    const expiredUser = await prisma.user.findUnique({
      select: { banned: true },
      where: { id: expired.userId },
    });
    assert.equal(expiredUser?.banned, true);
    assert.equal(await prisma.session.count({ where: { userId: expired.userId } }), 0);

    const activeUser = await prisma.user.findUnique({
      select: { banned: true },
      where: { id: active.userId },
    });
    assert.equal(activeUser?.banned, false);
    assert.equal(await prisma.session.count({ where: { userId: active.userId } }), 1);
  });

  it("returns null for an unknown grant", async () => {
    assert.equal(await revokeReviewerGrant(generateId()), null);
  });
});
