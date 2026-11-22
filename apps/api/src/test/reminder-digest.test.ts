import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { Prisma } from "@bondery/db";

import {
  resetEmailTransporterForTests,
  setSendRenderedEmailOverrideForTests,
} from "../lib/notifications/transporter.js";
import { loadTestEnv } from "./load-test-env.js";

const ISO_DATE_2026_07_29_PATTERN = /2026-07-29/;
const YEAR_2026_PATTERN = /2026/;
const SMTP_DOWN_PATTERN = /smtp down/;

loadTestEnv();

const { prisma } = await import("@bondery/db");
const emailI18n = await import("../lib/notifications/email-i18n.js");
const { sendOneUserDigest, sendReminderDigest } = await import(
  "../services/notifications/reminder-digest.js"
);

const userId = "00000000-0000-4000-8000-000000000001";
const reminderUser = {
  email: "user@example.com",
  reminders: [
    {
      date: "2026-08-01",
      notifyDaysBefore: 3 as const,
      notifyOn: "2026-07-29",
      personId: "00000000-0000-4000-8000-000000000002",
      personName: "Alex Example",
      type: "birthday" as const,
    },
  ],
  targetDate: "2026-07-29",
  timezone: "UTC",
  userId,
};

function setConfiguredEmailEnv(): void {
  process.env.BONDERY_PRIVATE_EMAIL_HOST = "smtp.example.com";
  process.env.BONDERY_PRIVATE_EMAIL_PORT = "587";
  process.env.BONDERY_PRIVATE_EMAIL_USER = "user";
  process.env.BONDERY_PRIVATE_EMAIL_PASS = "secret";
  process.env.BONDERY_PRIVATE_EMAIL_ADDRESS = "robot@usebondery.com";
  process.env.BONDERY_PRIVATE_EMAIL_REPLY_TO = "team@usebondery.com";
}

function buildCtx(overrides?: Partial<emailI18n.EmailFormatContext>) {
  return {
    defaultTargetDate: "2026-07-29",
    formatByUserId: new Map([
      [
        userId,
        {
          dateFormat: "locale" as const,
          locale: "en" as const,
          timeFormat: "24h" as const,
          timeZone: "UTC",
          ...overrides,
        },
      ],
    ]),
    namespaceCache: emailI18n.preloadEmailNamespaces("ReminderDigestEmail"),
  };
}

describe("sendOneUserDigest", () => {
  const originalCreate = prisma.reminderDispatchLog.create;
  const originalExecuteRaw = prisma.$executeRaw;

  beforeEach(() => {
    setConfiguredEmailEnv();
    setSendRenderedEmailOverrideForTests(async () => undefined);
  });

  afterEach(() => {
    prisma.reminderDispatchLog.create = originalCreate;
    prisma.$executeRaw = originalExecuteRaw;
    resetEmailTransporterForTests();
  });

  it("records dispatch log and advances schedule on SMTP success", async () => {
    let advanced = false;
    prisma.reminderDispatchLog.create = (async () => ({ id: "log-id" })) as typeof originalCreate;
    prisma.$executeRaw = (async () => {
      advanced = true;
      return 1;
    }) as typeof originalExecuteRaw;

    const result = await sendOneUserDigest(reminderUser, buildCtx());

    assert.equal(result.ok, true, result.ok ? undefined : result.error);
    assert.equal(advanced, true);
  });

  it("uses a formatted date in the digest subject, not ISO", async () => {
    let capturedSubject = "";
    setSendRenderedEmailOverrideForTests(async (options) => {
      capturedSubject = options.subject;
    });
    prisma.reminderDispatchLog.create = (async () => ({ id: "log-id" })) as typeof originalCreate;
    prisma.$executeRaw = (async () => 1) as typeof originalExecuteRaw;

    const result = await sendOneUserDigest(
      reminderUser,
      buildCtx({ dateFormat: "locale", locale: "de" }),
    );

    assert.equal(result.ok, true, result.ok ? undefined : result.error);
    assert.doesNotMatch(capturedSubject, ISO_DATE_2026_07_29_PATTERN);
    assert.match(capturedSubject, YEAR_2026_PATTERN);
  });

  it("does not log or advance when SMTP fails", async () => {
    setSendRenderedEmailOverrideForTests(async () => {
      throw new Error("smtp down");
    });

    let created = false;
    let advanced = false;
    prisma.reminderDispatchLog.create = (async () => {
      created = true;
      return { id: "log-id" };
    }) as typeof originalCreate;
    prisma.$executeRaw = (async () => {
      advanced = true;
      return 1;
    }) as typeof originalExecuteRaw;

    const result = await sendOneUserDigest(reminderUser, buildCtx());

    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.error, SMTP_DOWN_PATTERN);
    assert.equal(created, false);
    assert.equal(advanced, false);
  });

  it("treats duplicate dispatch log as idempotent success without re-advancing", async () => {
    let advanced = false;
    prisma.reminderDispatchLog.create = (async () => {
      throw new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        clientVersion: "test",
        code: "P2002",
      });
    }) as typeof originalCreate;
    prisma.$executeRaw = (async () => {
      advanced = true;
      return 1;
    }) as typeof originalExecuteRaw;

    const result = await sendOneUserDigest(reminderUser, buildCtx());

    assert.equal(result.ok, true);
    assert.equal(advanced, false);
  });
});

describe("sendReminderDigest", () => {
  const originalCreate = prisma.reminderDispatchLog.create;
  const originalExecuteRaw = prisma.$executeRaw;
  const originalFindMany = prisma.userSettings.findMany;

  beforeEach(() => {
    setConfiguredEmailEnv();
    setSendRenderedEmailOverrideForTests(async () => undefined);
    prisma.userSettings.findMany = (async () => []) as typeof originalFindMany;
  });

  afterEach(() => {
    prisma.reminderDispatchLog.create = originalCreate;
    prisma.$executeRaw = originalExecuteRaw;
    prisma.userSettings.findMany = originalFindMany;
    resetEmailTransporterForTests();
  });

  it("advances only successful users in a mixed batch", async () => {
    setSendRenderedEmailOverrideForTests(async (options) => {
      if (options.to === "fail@example.com") {
        throw new Error("smtp down");
      }
    });

    let advanceCount = 0;
    prisma.reminderDispatchLog.create = (async () => ({ id: "log-id" })) as typeof originalCreate;
    prisma.$executeRaw = (async () => {
      advanceCount += 1;
      return 1;
    }) as typeof originalExecuteRaw;

    const result = await sendReminderDigest({
      targetDate: "2026-07-29",
      users: [
        reminderUser,
        {
          ...reminderUser,
          email: "fail@example.com",
          userId: "00000000-0000-4000-8000-000000000099",
        },
      ],
    });

    assert.equal(result.success, false);
    assert.equal(result.sentUsers, 1);
    assert.equal(result.failedUsers, 1);
    assert.equal(advanceCount, 1);
  });
});
