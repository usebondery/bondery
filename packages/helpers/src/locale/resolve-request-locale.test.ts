import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveLocaleFromAcceptLanguage,
  resolveLocaleFromAcceptLanguageHeader,
  resolveRequestLocale,
} from "./resolve-request-locale.js";

describe("resolveLocaleFromAcceptLanguageHeader", () => {
  it("defaults to en when header is empty", () => {
    assert.equal(resolveLocaleFromAcceptLanguageHeader(""), "en");
  });

  it("detects cs from region code", () => {
    assert.equal(resolveLocaleFromAcceptLanguageHeader("cs-CZ"), "cs");
  });

  it("detects de from region code", () => {
    assert.equal(resolveLocaleFromAcceptLanguageHeader("de-DE"), "de");
  });

  it("respects q weights", () => {
    assert.equal(resolveLocaleFromAcceptLanguageHeader("en;q=0.8, cs;q=0.9"), "cs");
  });

  it("falls back to en for unsupported locale", () => {
    assert.equal(resolveLocaleFromAcceptLanguageHeader("ja-JP, en"), "en");
  });
});

describe("resolveLocaleFromAcceptLanguage", () => {
  it("reads accept-language from Headers", () => {
    assert.equal(
      resolveLocaleFromAcceptLanguage(new Headers({ "accept-language": "de-DE" })),
      "de",
    );
  });
});

describe("resolveRequestLocale", () => {
  it("prefers session language over header", () => {
    assert.equal(resolveRequestLocale(new Headers({ "accept-language": "de-DE" }), "cs"), "cs");
  });

  it("falls back to header when session language is missing", () => {
    assert.equal(resolveRequestLocale(new Headers({ "accept-language": "cs-CZ" }), null), "cs");
  });
});
