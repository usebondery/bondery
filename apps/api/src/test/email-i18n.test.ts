import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatEmailDate,
  formatEmailDateFromIso,
  interpolateCopy,
  loadEmailNamespace,
  readCopyString,
} from "../lib/notifications/email-i18n.js";

const SUPPORT_PATTERN = /\{\{support\}\}/;
const DOCUMENTATION_PATTERN = /\{\{documentation\}\}/;
const YEAR_2026_PATTERN = /2026/;
const YEAR_2026_PREFIX_PATTERN = /^2026/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

describe("email-i18n", () => {
  it("loads TrialEndingEmail copy for Czech", () => {
    const bundle = loadEmailNamespace("cs", "TrialEndingEmail");

    assert.equal(typeof bundle.subject, "string");
    assert.ok(bundle.subject.length > 0);
    assert.equal(typeof bundle.heading, "string");
  });

  it("interpolates copy placeholders", () => {
    const result = interpolateCopy("Hello {{userName}}, ends {{endDate}}", {
      endDate: "Jan 1",
      userName: "Alex",
    });

    assert.equal(result, "Hello Alex, ends Jan 1");
  });

  it("reads and interpolates EmailChrome help copy", () => {
    const bundle = loadEmailNamespace("en", "EmailChrome");
    const help = readCopyString(bundle, "help");

    assert.match(help, SUPPORT_PATTERN);
    assert.match(help, DOCUMENTATION_PATTERN);
  });

  it("formats dates per locale", () => {
    const date = new Date("2026-07-30T00:00:00Z");
    const en = {
      dateFormat: "locale" as const,
      locale: "en" as const,
      timeFormat: "24h" as const,
      timeZone: "UTC",
    };
    const de = { ...en, locale: "de" as const };
    const hu = { ...en, locale: "hu" as const };

    assert.match(formatEmailDate(date, en), YEAR_2026_PATTERN);
    assert.match(formatEmailDateFromIso("2026-07-30", de), YEAR_2026_PATTERN);
    assert.match(formatEmailDate(date, hu), YEAR_2026_PREFIX_PATTERN);
  });

  it("does not use a raw ISO date when the language is not numeric ymd", () => {
    const ctx = {
      dateFormat: "locale" as const,
      locale: "cs" as const,
      timeFormat: "24h" as const,
      timeZone: "UTC",
    };
    const formatted = formatEmailDateFromIso("2026-07-29", ctx, "long");
    assert.doesNotMatch(formatted, ISO_DATE_PATTERN);
    assert.match(formatted, YEAR_2026_PATTERN);
  });
});
