import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { buildMagicLinkCopy } from "../lib/notifications/email-copy-builders.js";
import { loadEmailNamespace, readCopyString } from "../lib/notifications/email-i18n.js";
import {
  resetEmailTransporterForTests,
  setSendRenderedEmailOverrideForTests,
} from "../lib/notifications/transporter.js";
import { sendMagicLinkEmail } from "../services/notifications/magic-link.js";

const SMTP_ENV_KEYS = [
  "BONDERY_PRIVATE_EMAIL_HOST",
  "BONDERY_PRIVATE_EMAIL_PORT",
  "BONDERY_PRIVATE_EMAIL_USER",
  "BONDERY_PRIVATE_EMAIL_PASS",
  "BONDERY_PRIVATE_EMAIL_ADDRESS",
  "BONDERY_PRIVATE_EMAIL_REPLY_TO",
] as const;

type SmtpEnvSnapshot = Record<(typeof SMTP_ENV_KEYS)[number], string | undefined>;

function snapshotSmtpEnv(): SmtpEnvSnapshot {
  return Object.fromEntries(SMTP_ENV_KEYS.map((key) => [key, process.env[key]])) as SmtpEnvSnapshot;
}

function restoreSmtpEnv(snapshot: SmtpEnvSnapshot): void {
  for (const key of SMTP_ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      Reflect.deleteProperty(process.env, key);
    } else {
      process.env[key] = value;
    }
  }
}

function setConfiguredSmtpEnv(): void {
  process.env.BONDERY_PRIVATE_EMAIL_HOST = "smtp.example.com";
  process.env.BONDERY_PRIVATE_EMAIL_PORT = "587";
  process.env.BONDERY_PRIVATE_EMAIL_USER = "user";
  process.env.BONDERY_PRIVATE_EMAIL_PASS = "secret";
  process.env.BONDERY_PRIVATE_EMAIL_ADDRESS = "robot@usebondery.com";
  process.env.BONDERY_PRIVATE_EMAIL_REPLY_TO = "team@usebondery.com";
}

function clearSmtpEnv(): void {
  for (const key of SMTP_ENV_KEYS) {
    Reflect.deleteProperty(process.env, key);
  }
}

describe("magic-link email", () => {
  const smtpSnapshot = snapshotSmtpEnv();

  afterEach(() => {
    restoreSmtpEnv(smtpSnapshot);
    resetEmailTransporterForTests();
  });

  it("builds English copy from the MagicLinkEmail namespace", () => {
    const bundle = loadEmailNamespace("en", "MagicLinkEmail");
    const copy = buildMagicLinkCopy(bundle);

    assert.equal(copy.cta, "Sign in to Bondery");
    assert.equal(copy.heading, "Your sign-in link");
    assert.equal(readCopyString(bundle, "subject"), "Your Bondery sign-in link");
    assert.match(copy.whyReceiving, /asked to sign in/);
  });

  it("sends via sendRenderedEmail with locale subject and no PII in logs", async () => {
    setConfiguredSmtpEnv();
    const sent: Array<{ from: string; html: string; subject: string; text: string; to: string }> =
      [];
    const logRecords: unknown[] = [];
    setSendRenderedEmailOverrideForTests(async (options) => {
      sent.push({
        from: options.from,
        html: options.html,
        subject: options.subject,
        text: options.text,
        to: options.to,
      });
    });

    const log = {
      info(payload: unknown, message?: string) {
        logRecords.push({ message, payload });
      },
    };

    await sendMagicLinkEmail(
      {
        email: "person@example.test",
        language: "cs",
        url: "https://api.example.test/auth/magic-link/verify?token=secret-token",
      },
      log as never,
    );

    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.to, "person@example.test");
    assert.equal(sent[0]?.subject, "Váš přihlašovací odkaz do Bondery");
    assert.equal(sent[0]?.from, "Robot from Bondery <robot@usebondery.com>");
    assert.match(sent[0]?.html ?? "", /secret-token/);
    assert.doesNotMatch(sent[0]?.html ?? "", /Sveetech s\.r\.o\./);
    assert.match(sent[0]?.html ?? "", /\/contact/);
    assert.match(sent[0]?.html ?? "", /\/docs/);
    assert.match(sent[0]?.text ?? "", /secret-token/);
    assert.doesNotMatch(sent[0]?.text ?? "", /Sveetech/);
    const serializedLogs = JSON.stringify(logRecords);
    assert.doesNotMatch(serializedLogs, /person@example\.test/);
    assert.doesNotMatch(serializedLogs, /secret-token/);
    assert.doesNotMatch(serializedLogs, /magic-link\/verify/);
  });

  it("throws when SMTP is not configured", async () => {
    clearSmtpEnv();
    resetEmailTransporterForTests();
    await assert.rejects(
      () =>
        sendMagicLinkEmail({
          email: "person@example.test",
          language: "en",
          url: "https://example.test/verify",
        }),
      /email_service_not_configured/,
    );
  });
});
