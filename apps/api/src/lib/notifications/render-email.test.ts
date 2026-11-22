import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EMAIL_PREVIEW_MAX_CHARS, MagicLinkEmail, ReminderDigestEmail } from "@bondery/emails";
import { defaultMagicLinkCopy } from "@bondery/emails/fixtures/default-copy";
import { renderEmailParts } from "./render-email.js";

const SIGN_IN_TO_BONDERY_PATTERN = /Sign in to Bondery/;
const SVEETECH_PATTERN = /Sveetech/;
const NINETY_ONE_X_PATTERN = /x{91}/;
const MANAGE_THESE_NOTIFICATIONS_IN_BONDERY_PATTERN = /Manage these notifications in Bondery/;
const EXPIRES_IN_MINUTES_PATTERN = /Expires in 15 minutes/;
const MANAGE_THESE_NOTIFICATIONS_PATTERN = /Manage these notifications/;
const SECRET_TOKEN_PATTERN = /secret-token/;

describe("renderEmailParts", () => {
  it("sends HTML plus plaintext without legal identity on transactional mail", async () => {
    const url = "https://api.example.test/auth/magic-link/verify?token=secret-token";
    const { html, text } = await renderEmailParts(
      MagicLinkEmail({
        copy: defaultMagicLinkCopy,
        title: "Your Bondery sign-in link",
        url,
      }),
    );

    assert.match(html, EXPIRES_IN_MINUTES_PATTERN);
    assert.doesNotMatch(html, SVEETECH_PATTERN);
    assert.doesNotMatch(html, MANAGE_THESE_NOTIFICATIONS_PATTERN);
    assert.match(text, SECRET_TOKEN_PATTERN);
    assert.match(text, SIGN_IN_TO_BONDERY_PATTERN);
    assert.doesNotMatch(text, SVEETECH_PATTERN);
  });

  it("clips inbox preview to 90 characters", async () => {
    const { html } = await renderEmailParts(
      MagicLinkEmail({
        copy: { ...defaultMagicLinkCopy, preview: "x".repeat(120) },
        url: "https://example.test/verify",
      }),
    );

    assert.doesNotMatch(html, NINETY_ONE_X_PATTERN);
    assert.match(html, new RegExp(`x{${EMAIL_PREVIEW_MAX_CHARS - 1}}…`));
  });

  it("keeps manage-notifications on reminder digest and still hides legal identity", async () => {
    const { html, text } = await renderEmailParts(
      ReminderDigestEmail({
        formattedHeadingDate: "January 1",
        targetDate: "2026-01-01",
        userId: "preview-user",
      }),
    );

    assert.match(html, MANAGE_THESE_NOTIFICATIONS_IN_BONDERY_PATTERN);
    assert.match(text, MANAGE_THESE_NOTIFICATIONS_IN_BONDERY_PATTERN);
    assert.doesNotMatch(html, SVEETECH_PATTERN);
    assert.doesNotMatch(text, SVEETECH_PATTERN);
  });
});
