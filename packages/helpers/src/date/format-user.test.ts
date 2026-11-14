import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DateFormatPreference, TimeFormatPreference } from "@bondery/schemas";
import {
  type DateTimeFormatContext,
  dateInputValueFormat,
  formatClockTime,
  formatOrderedDate,
  formatUserDate,
  formatUserDateField,
  formatUserDateTime,
  formatUserTime,
} from "./format-user.js";

const SAMPLE = new Date(Date.UTC(2026, 10, 13, 15, 30, 45));
const EARLY = new Date(Date.UTC(2026, 10, 13, 8, 5, 0));
const LOCALES = ["cs", "de", "en"] as const;
const DATE_FORMATS: DateFormatPreference[] = ["locale", "mdy", "dmy", "ymd"];
const TIME_FORMATS: TimeFormatPreference[] = ["12h", "24h"];

function ctx(
  locale: string,
  dateFormat: DateFormatPreference,
  timeFormat: TimeFormatPreference,
): DateTimeFormatContext {
  return { dateFormat, locale, timeFormat, timeZone: "UTC" };
}

describe("formatUserDate", () => {
  for (const locale of LOCALES) {
    for (const dateFormat of DATE_FORMATS) {
      for (const timeFormat of TIME_FORMATS) {
        const formatCtx = ctx(locale, dateFormat, timeFormat);

        it(`numeric ${locale} ${dateFormat} ${timeFormat}`, () => {
          const formatted = formatUserDate(SAMPLE, formatCtx, "numeric");
          if (dateFormat === "mdy") {
            assert.equal(formatted, "11/13/2026");
          } else if (dateFormat === "dmy") {
            assert.equal(formatted, "13/11/2026");
          } else if (dateFormat === "ymd") {
            assert.equal(formatted, "2026-11-13");
          } else {
            assert.match(formatted, /2026/);
            assert.match(formatted, /11|13/);
          }
        });

        it(`monthYear ${locale} ${dateFormat} ${timeFormat}`, () => {
          const formatted = formatUserDate(SAMPLE, formatCtx, "monthYear");
          assert.match(formatted, /2026/);
          assert.doesNotMatch(formatted, /^\d{4}-\d{2}-\d{2}$/);
        });

        it(`monthYearLong ${locale} ${dateFormat} ${timeFormat}`, () => {
          const formatted = formatUserDate(SAMPLE, formatCtx, "monthYearLong");
          assert.match(formatted, /2026/);
          assert.match(formatted, /November|listopad|listopadu/i);
        });
      }
    }
  }

  it("re-exports formatOrderedDate", () => {
    const formatted = formatOrderedDate({
      date: SAMPLE,
      dateFormat: "ymd",
      intlLocaleTag: "en-US-u-ca-gregory-hc-h23-nu-latn",
      timeZone: "UTC",
    });
    assert.equal(formatted, "2026-11-13");
  });

  it("takes a per-call timezone without mutating the context", () => {
    const formatCtx = ctx("en", "mdy", "24h");
    const local = formatUserDate(SAMPLE, formatCtx, "numeric", { timeZone: "Pacific/Honolulu" });
    assert.equal(local, "11/13/2026");
    assert.equal(formatCtx.timeZone, "UTC");
  });
});

describe("formatUserDateField", () => {
  it("formats one calendar field", () => {
    const formatCtx = ctx("en", "locale", "24h");
    assert.equal(formatUserDateField(SAMPLE, formatCtx, "dayTwoDigit"), "13");
    assert.equal(formatUserDateField(SAMPLE, formatCtx, "yearNumeric"), "2026");
    assert.equal(formatUserDateField(SAMPLE, formatCtx, "monthLong"), "November");
    assert.equal(formatUserDateField(SAMPLE, formatCtx, "monthShort"), "Nov");
  });

  it("keeps a UTC calendar date on the same day when the user zone is west of UTC", () => {
    const formatCtx = ctx("en", "locale", "24h");
    const midnightUtc = new Date(Date.UTC(2026, 10, 13, 0, 0, 0));
    assert.equal(
      formatUserDateField(midnightUtc, formatCtx, "dayTwoDigit", { timeZone: "UTC" }),
      "13",
    );
  });
});

describe("formatUserTime and formatClockTime", () => {
  // Exact strings, so a locale that changes its day period shows up here.
  const expected: Record<
    string,
    { clock12: string; clock12Seconds: string; storedClock12: string; time24: string }
  > = {
    cs: {
      clock12: "3:30 odp.",
      clock12Seconds: "3:30:45 odp.",
      storedClock12: "8:00 dop.",
      time24: "15:30",
    },
    de: {
      clock12: "3:30 PM",
      clock12Seconds: "3:30:45 PM",
      storedClock12: "8:00 AM",
      time24: "15:30",
    },
    en: {
      clock12: "3:30 PM",
      clock12Seconds: "3:30:45 PM",
      storedClock12: "8:00 AM",
      time24: "15:30",
    },
  };

  for (const locale of LOCALES) {
    for (const dateFormat of DATE_FORMATS) {
      const formatCtx12 = ctx(locale, dateFormat, "12h");
      const formatCtx24 = ctx(locale, dateFormat, "24h");
      const sample = expected[locale];

      it(`wall clock ${locale} ${dateFormat} 12h`, () => {
        assert.equal(formatUserTime(SAMPLE, formatCtx12), sample.clock12);
        assert.equal(
          formatUserTime(SAMPLE, formatCtx12, { withSeconds: true }),
          sample.clock12Seconds,
        );
      });

      it(`wall clock ${locale} ${dateFormat} 24h`, () => {
        assert.equal(formatUserTime(SAMPLE, formatCtx24), sample.time24);
        assert.equal(formatUserTime(SAMPLE, formatCtx24, { withSeconds: true }), "15:30:45");
      });

      it(`stored clock ${locale} ${dateFormat}`, () => {
        assert.equal(formatClockTime("08:00:00", formatCtx12), sample.storedClock12);
        assert.equal(formatClockTime("08:00:00", formatCtx24), "08:00");
      });
    }
  }

  it("leads with the day period where the locale puts it first", () => {
    // Turkish and Hungarian write the day period before the hour. Both ship.
    assert.equal(formatUserTime(SAMPLE, ctx("tr", "locale", "12h")), "ÖS 3:30");
    assert.equal(formatClockTime("08:00:00", ctx("tr", "locale", "12h")), "ÖÖ 8:00");
    assert.equal(formatUserTime(SAMPLE, ctx("hu", "locale", "12h")), "du. 3:30");
    assert.equal(formatClockTime("08:00:00", ctx("hu", "locale", "12h")), "de. 8:00");
  });

  it("keeps the stored clock digits when the display zone differs", () => {
    const formatted = formatClockTime("08:00:00", {
      dateFormat: "locale",
      locale: "en",
      timeFormat: "24h",
      timeZone: "America/Los_Angeles",
    });
    assert.equal(formatted, "08:00");
  });

  it("applies the display zone to a Date instant", () => {
    const formatted = formatUserTime(EARLY, {
      dateFormat: "locale",
      locale: "en",
      timeFormat: "24h",
      timeZone: "America/Los_Angeles",
    });
    assert.equal(formatted, "00:05");
  });

  it("returns an unparseable stored clock unchanged", () => {
    assert.equal(formatClockTime("not a time", ctx("en", "locale", "24h")), "not a time");
  });
});

describe("formatUserDateTime", () => {
  it("joins a medium date and a wall clock", () => {
    const formatted = formatUserDateTime(SAMPLE, ctx("en", "ymd", "24h"));
    assert.equal(formatted, "2026 Nov 13 15:30");
  });
});

describe("dateInputValueFormat", () => {
  it("returns Mantine tokens for each order", () => {
    assert.equal(dateInputValueFormat(ctx("en", "mdy", "24h"), { withYear: true }), "MM/DD/YYYY");
    assert.equal(dateInputValueFormat(ctx("en", "mdy", "24h"), { withYear: false }), "MM/DD");
    assert.equal(dateInputValueFormat(ctx("en", "dmy", "24h"), { withYear: true }), "DD/MM/YYYY");
    assert.equal(dateInputValueFormat(ctx("en", "dmy", "24h"), { withYear: false }), "DD/MM");
    assert.equal(dateInputValueFormat(ctx("en", "ymd", "24h"), { withYear: true }), "YYYY-MM-DD");
    assert.equal(dateInputValueFormat(ctx("en", "ymd", "24h"), { withYear: false }), "MM-DD");
    assert.equal(dateInputValueFormat(ctx("en", "locale", "24h"), { withYear: true }), "LL");
  });

  it("picks month-first or day-first yearless locale tokens", () => {
    const en = dateInputValueFormat(ctx("en", "locale", "24h"), { withYear: false });
    const cs = dateInputValueFormat(ctx("cs", "locale", "24h"), { withYear: false });
    assert.equal(en, "MMMM D");
    assert.equal(cs, "D MMMM");
  });
});
