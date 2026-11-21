import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatTimezoneLabel, getGroupedTimezones, TIMEZONES_DATA } from "./timezones.js";

function supportsTimeZoneDisplayNames(): boolean {
  try {
    const names = new Intl.DisplayNames(["cs-CZ"], {
      type: "timeZone" as Intl.DisplayNamesOptions["type"],
    });
    const city = names.of("Europe/Prague");
    return Boolean(city && city !== "Europe/Prague");
  } catch {
    return false;
  }
}

describe("formatTimezoneLabel", () => {
  it("localizes the German country and city when DisplayNames supports timeZone", {
    skip: !supportsTimeZoneDisplayNames(),
  }, () => {
    const prague = TIMEZONES_DATA.find((timezone) => timezone.value === "Europe/Prague");
    assert.ok(prague);
    const label = formatTimezoneLabel(prague, "de-DE");
    assert.match(label, /Tschechien/);
    assert.match(label, /Prag/);
  });

  it("localizes the German country and falls back to Prague without timeZone DisplayNames", {
    skip: supportsTimeZoneDisplayNames(),
  }, () => {
    const prague = TIMEZONES_DATA.find((timezone) => timezone.value === "Europe/Prague");
    assert.ok(prague);
    const label = formatTimezoneLabel(prague, "de-DE");
    assert.match(label, /Tschechien/);
    assert.match(label, /Prague/);
  });

  it("localizes Prague to Praha on Czech when DisplayNames supports timeZone", {
    skip: !supportsTimeZoneDisplayNames(),
  }, () => {
    const prague = TIMEZONES_DATA.find((timezone) => timezone.value === "Europe/Prague");
    assert.ok(prague);
    const label = formatTimezoneLabel(prague, "cs-CZ");
    assert.match(label, /Česko|Česká/);
    assert.match(label, /Praha/);
  });

  it("falls back to Prague on Czech when DisplayNames does not support timeZone", {
    skip: supportsTimeZoneDisplayNames(),
  }, () => {
    const prague = TIMEZONES_DATA.find((timezone) => timezone.value === "Europe/Prague");
    assert.ok(prague);
    const label = formatTimezoneLabel(prague, "cs-CZ");
    assert.match(label, /Česko|Česká/);
    assert.match(label, /Prague/);
  });
});

describe("getGroupedTimezones", () => {
  it("builds a fresh locale fast and reuses it", () => {
    // Regression: each label rebuilt the whole tzdb list, so one build took about 20 seconds
    // and the settings page froze. The budget is generous so a slow CI runner still passes.
    const started = performance.now();
    const first = getGroupedTimezones("fr-FR");
    assert.ok(performance.now() - started < 2000, "first build took too long");
    assert.equal(getGroupedTimezones("fr-FR"), first);
  });

  it("localizes continent group labels", () => {
    const europe = getGroupedTimezones("de-DE").find((group) => group.group === "Europa");
    assert.ok(europe);
    assert.ok(europe.items.some((item) => item.label.includes("Tschechien")));
  });

  it("keeps English city and IANA in the search haystack", () => {
    const europe = getGroupedTimezones("cs-CZ").find((group) =>
      group.items.some((item) => item.value === "Europe/Prague"),
    );
    assert.ok(europe);
    const prague = europe.items.find((item) => item.value === "Europe/Prague");
    assert.ok(prague);
    assert.match(prague.searchHaystack, /prague/);
    assert.match(prague.searchHaystack, /europe\/prague/);
  });
});
