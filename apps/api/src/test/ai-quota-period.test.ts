/**
 * AI chat quota period against real Postgres.
 *
 * The usage screen and the chat gate must report one number for one quota. They
 * disagreed before: the read path added 30 days to a column the SQL layer treated
 * as a deadline, so the settings card named a reset a month after the one the chat
 * alert named. These tests pin both paths to `get_ai_quota`.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { prisma } from "@bondery/db";
import { generateId } from "@bondery/helpers/ids";
import { loadTestEnv } from "./load-test-env.js";

loadTestEnv();

const { checkAndIncrementQuota, checkChatQuota } = await import("../services/chat/quota.js");

const DAY_MS = 24 * 60 * 60 * 1000;

describe("ai chat quota period", () => {
  const createdUserIds: string[] = [];

  async function seedUser(): Promise<{ userId: string }> {
    const userId = generateId();
    await prisma.user.create({
      data: {
        email: `ai-quota-${userId}@example.test`,
        emailVerified: true,
        id: userId,
        name: "Quota Test",
      },
    });
    createdUserIds.push(userId);
    await prisma.userSettings.create({
      data: {
        aiMessagesMonthResetAt: new Date(Date.now() + 30 * DAY_MS),
        id: generateId(),
        nextReminderAtUtc: new Date(),
        userId,
      },
    });
    return { userId };
  }

  async function setWindow(userId: string, used: number, resetAt: Date): Promise<void> {
    await prisma.userSettings.update({
      data: { aiMessagesMonthResetAt: resetAt, aiMessagesThisMonth: used },
      where: { userId },
    });
  }

  function premiumContext(userId: string) {
    return {
      log: undefined,
      user: { email: `ai-quota-${userId}@example.test`, id: userId },
    };
  }

  /** A context for an account with no subscription row, so premium resolves to false. */
  function freeContext(userId: string) {
    return {
      log: undefined,
      user: { email: `ai-quota-${userId}@example.test`, id: userId },
    };
  }

  async function makePremium(userId: string): Promise<void> {
    await prisma.subscription.create({
      data: {
        cancelAtPeriodEnd: false,
        currency: "eur",
        currentPeriodEnd: new Date(Date.now() + 10 * DAY_MS),
        currentPeriodStart: new Date(Date.now() - 20 * DAY_MS),
        id: generateId(),
        status: "active",
        stripeCustomerId: `cus_${userId}`,
        stripeStatus: "active",
        stripeSubscriptionId: `sub_${userId}`,
        userId,
      },
    });
  }

  before(() => {
    assert.ok(prisma, "prisma client required");
  });

  after(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  it("reports the same usage and reset instant from the read path and the gate", async () => {
    const { userId } = await seedUser();
    const resetAt = new Date(Date.now() + 10 * DAY_MS);
    await setWindow(userId, 4, resetAt);

    const read = await checkChatQuota(userId, true);
    assert.equal(read.messagesUsed, 4);
    assert.equal(read.resetAt, resetAt.toISOString());

    const gate = await checkAndIncrementQuota(premiumContext(userId));
    assert.equal(gate.messagesUsed, 5);
    // One window, so the reset instant cannot move between the two calls.
    assert.equal(gate.resetAt, read.resetAt);
  });

  it("reports no usage and no reset once the stored window has ended", async () => {
    const { userId } = await seedUser();
    await setWindow(userId, 40, new Date(Date.now() - DAY_MS));

    const read = await checkChatQuota(userId, true);
    assert.equal(read.messagesUsed, 0);
    assert.equal(read.resetAt, null);
  });

  it("starts the next window from the old end, not from now", async () => {
    const { userId } = await seedUser();
    // A period that ended one day ago keeps its anchor when the window advances.
    const endedAt = new Date(Date.now() - DAY_MS);
    await setWindow(userId, 40, endedAt);

    const gate = await checkAndIncrementQuota(premiumContext(userId));
    assert.equal(gate.messagesUsed, 1, "a new window starts empty");

    const expectedEnd = new Date(endedAt);
    expectedEnd.setUTCMonth(expectedEnd.getUTCMonth() + 1);
    assert.equal(gate.resetAt, expectedEnd.toISOString());
  });

  it("keeps the reset on the billing period end the webhook wrote", async () => {
    const { userId } = await seedUser();
    const periodEnd = new Date(Date.now() + 21 * DAY_MS);
    await setWindow(userId, 4, periodEnd);

    await prisma.subscription.create({
      data: {
        cancelAtPeriodEnd: false,
        currency: "eur",
        currentPeriodEnd: periodEnd,
        currentPeriodStart: new Date(Date.now() - 9 * DAY_MS),
        id: generateId(),
        status: "active",
        stripeCustomerId: `cus_${userId}`,
        stripeStatus: "active",
        stripeSubscriptionId: `sub_${userId}`,
        userId,
      },
    });

    const read = await checkChatQuota(userId);
    assert.equal(read.resetAt, periodEnd.toISOString());
    // The usage screen and the renewal line above it now name one date.
    assert.equal(read.resetAt, (await checkChatQuota(userId, true)).resetAt);
  });

  it("gives a free account a monthly counter inside its period", async () => {
    const { userId } = await seedUser();
    const resetAt = new Date(Date.now() + 12 * DAY_MS);
    await setWindow(userId, 3, resetAt);

    const read = await checkChatQuota(userId);
    assert.equal(read.plan, "free");
    assert.equal(read.limit, 5);
    assert.equal(read.messagesUsed, 3);
    assert.equal(read.resetAt, resetAt.toISOString(), "a free account has a reset date too");
  });

  it("counts the paid usage of a cancelled plan in its free allowance", async () => {
    const { userId } = await seedUser();
    // 10 paid turns bumped the monthly counter as well as the lifetime one.
    await prisma.userSettings.update({
      data: { aiMessagesThisMonth: 10, aiMessagesUsed: 10 },
      where: { userId },
    });

    const read = await checkChatQuota(userId);
    assert.equal(read.plan, "free");
    assert.equal(
      read.messagesUsed,
      10,
      "the free screen reads the period counter, not the lifetime one",
    );
    assert.equal(read.limit, 5);
    assert.equal(read.allowed, false);
  });

  it("refills a free allowance when its period ends", async () => {
    const { userId } = await seedUser();
    await setWindow(userId, 5, new Date(Date.now() - DAY_MS));

    const gate = await checkAndIncrementQuota(freeContext(userId));
    assert.equal(gate.allowed, true, "a new free period starts with the full allowance");
    assert.equal(gate.messagesUsed, 1);
  });

  it("stops a premium subscriber at the monthly cap", async () => {
    const { userId } = await seedUser();
    await makePremium(userId);
    await setWindow(userId, 300, new Date(Date.now() + 10 * DAY_MS));

    const gate = await checkAndIncrementQuota(premiumContext(userId));
    assert.equal(gate.allowed, false, "premium is a cap, not an unlimited plan");
    assert.equal(gate.messagesUsed, 300);
  });
});
