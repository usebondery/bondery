import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SUPPORTED_LOCALES } from "@bondery/translations";
import { DICTATION_FALLBACK_LANGUAGE_TAG, dictationLanguageTag } from "./dictationLanguage.js";

describe("dictationLanguageTag", () => {
  it("maps every supported locale to a region tag", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const tag = dictationLanguageTag(locale);
      assert.ok(tag.startsWith(locale), `tag ${tag} does not start with the locale ${locale}`);
      assert.ok(tag.includes("-"), `tag ${tag} has no region subtag`);
    }
  });

  it("returns a Czech tag for Czech", () => {
    assert.equal(dictationLanguageTag("cs"), "cs-CZ");
  });

  it("returns a German tag for German", () => {
    assert.equal(dictationLanguageTag("de"), "de-DE");
  });

  it("returns an English tag for English", () => {
    assert.equal(dictationLanguageTag("en"), "en-US");
  });

  it("falls back to English for an unknown locale", () => {
    const unknown = "ja" as unknown as Parameters<typeof dictationLanguageTag>[0];
    assert.equal(dictationLanguageTag(unknown), DICTATION_FALLBACK_LANGUAGE_TAG);
  });
});
