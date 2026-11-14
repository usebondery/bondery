import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildIntlLocaleTag,
  directionFromDirField,
  fontStackForLocale,
  formatOrderedDate,
  parseAmbiguousNumericDate,
} from "./intl-format.js";
import { APP_LOCALE_METADATA, dirForLocale } from "./supported-locale/schema.js";

describe("dirForLocale", () => {
  it("returns ltr for every shipped catalog locale", () => {
    for (const entry of APP_LOCALE_METADATA) {
      assert.equal(dirForLocale(entry.code), entry.dir ?? "ltr");
    }
  });

  it("falls back to ltr for unknown codes", () => {
    assert.equal(dirForLocale("xx"), "ltr");
  });
});

describe("directionFromDirField", () => {
  it("maps rtl and defaults others to ltr", () => {
    assert.equal(directionFromDirField("rtl"), "rtl");
    assert.equal(directionFromDirField("ltr"), "ltr");
    assert.equal(directionFromDirField(undefined), "ltr");
  });
});

describe("buildIntlLocaleTag", () => {
  it("pins calendar, digits, and hour cycle in one extension", () => {
    assert.equal(buildIntlLocaleTag("en", "12h"), "en-US-u-ca-gregory-hc-h12-nu-latn");
    assert.doesNotMatch(buildIntlLocaleTag("en", "12h"), /-u-.*-u-/);
  });
});

describe("formatOrderedDate", () => {
  const sample = new Date(Date.UTC(2026, 10, 13, 12, 0, 0));

  it("uses locale order for en-US", () => {
    const tag = buildIntlLocaleTag("en", "24h");
    const formatted = formatOrderedDate({
      date: sample,
      dateFormat: "locale",
      intlLocaleTag: tag,
    });
    assert.equal(formatted, "11/13/2026");
  });

  it("overrides numeric order", () => {
    const tag = buildIntlLocaleTag("en", "24h");
    assert.equal(
      formatOrderedDate({ date: sample, dateFormat: "mdy", intlLocaleTag: tag }),
      "11/13/2026",
    );
    assert.equal(
      formatOrderedDate({ date: sample, dateFormat: "dmy", intlLocaleTag: tag }),
      "13/11/2026",
    );
    assert.equal(
      formatOrderedDate({ date: sample, dateFormat: "ymd", intlLocaleTag: tag }),
      "2026-11-13",
    );
  });
});

describe("parseAmbiguousNumericDate", () => {
  it("reads mdy and dmy only when preference is set", () => {
    assert.deepEqual(parseAmbiguousNumericDate("03/04/2026", "mdy"), {
      day: 4,
      month: 3,
      year: 2026,
    });
    assert.deepEqual(parseAmbiguousNumericDate("03/04/2026", "dmy"), {
      day: 3,
      month: 4,
      year: 2026,
    });
    assert.equal(parseAmbiguousNumericDate("03/04/2026", "locale"), null);
    assert.equal(parseAmbiguousNumericDate("03/04/2026", "ymd"), null);
  });
});

describe("fontStackForLocale", () => {
  it("returns script stacks for future locales", () => {
    assert.match(fontStackForLocale("ja") ?? "", /Yu Gothic/);
    assert.equal(fontStackForLocale("en"), null);
  });
});
