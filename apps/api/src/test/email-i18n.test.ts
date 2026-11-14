import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatEmailDate,
  formatEmailDateFromIso,
  interpolateCopy,
  loadEmailNamespace,
  readCopyString,
} from "../lib/notifications/email-i18n.js";

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

    assert.match(help, /\{\{support\}\}/);
    assert.match(help, /\{\{documentation\}\}/);
  });

  it("formats dates per locale", () => {
    const date = new Date("2026-07-30T00:00:00Z");

    assert.match(formatEmailDate(date, "en"), /2026/);
    assert.match(formatEmailDateFromIso("2026-07-30", "de"), /2026/);
    assert.match(formatEmailDate(date, "hu"), /^2026/);
  });
});
