import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { buildMagicLinkCopy } from "../lib/notifications/email-copy-builders.js";
import { loadEmailNamespace, readCopyString } from "../lib/notifications/email-i18n.js";
import {
  resetEmailTransporterForTests,
  setSendRenderedEmailOverrideForTests,
} from "../lib/notifications/transporter.js";
import { sendMagicLinkEmail } from "../services/notifications/magic-link.js";

const SECRET_TOKEN_PATTERN = /secret-token/;
const ASKED_TO_SIGN_IN_PATTERN = /asked to sign in/;
const SVEETECH_S_R_O_PATTERN = /Sveetech s\.r\.o\./;
const CONTACT_PATTERN = /\/contact/;
const DOCS_PATTERN = /\/docs/;
const SVEETECH_PATTERN = /Sveetech/;
const PERSON_EXAMPLE_TEST_PATTERN = /person@example\.test/;
const MAGIC_LINK_VERIFY_PATTERN = /magic-link\/verify/;
const EMAIL_SERVICE_NOT_CONFIGURED_PATTERN = /email_service_not_configured/;

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
  process.env["BONDERY_PRIVATE_EMAIL_HOST"] = "smtp.example.com";
  process.env["BONDERY_PRIVATE_EMAIL_PORT"] = "587";
  process.env["BONDERY_PRIVATE_EMAIL_USER"] = "user";
  process.env["BONDERY_PRIVATE_EMAIL_PASS"] = "secret";
  process.env["BONDERY_PRIVATE_EMAIL_ADDRESS"] = "robot@usebondery.com";
  process.env["BONDERY_PRIVATE_EMAIL_REPLY_TO"] = "team@usebondery.com";
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
    assert.match(copy.whyReceiving, ASKED_TO_SIGN_IN_PATTERN);
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
    assert.match(sent[0]?.html ?? "", SECRET_TOKEN_PATTERN);
    assert.doesNotMatch(sent[0]?.html ?? "", SVEETECH_S_R_O_PATTERN);
    assert.match(sent[0]?.html ?? "", CONTACT_PATTERN);
    assert.match(sent[0]?.html ?? "", DOCS_PATTERN);
    assert.match(sent[0]?.text ?? "", SECRET_TOKEN_PATTERN);
    assert.doesNotMatch(sent[0]?.text ?? "", SVEETECH_PATTERN);
    const serializedLogs = JSON.stringify(logRecords);
    assert.doesNotMatch(serializedLogs, PERSON_EXAMPLE_TEST_PATTERN);
    assert.doesNotMatch(serializedLogs, SECRET_TOKEN_PATTERN);
    assert.doesNotMatch(serializedLogs, MAGIC_LINK_VERIFY_PATTERN);
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
      EMAIL_SERVICE_NOT_CONFIGURED_PATTERN,
    );
  });
});
