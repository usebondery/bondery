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
  it("localizes the country for the UI locale", () => {
    const prague = TIMEZONES_DATA.find((timezone) => timezone.value === "Europe/Prague");
    assert.ok(prague);
    const label = formatTimezoneLabel(prague, "de-DE");
    assert.match(label, /Tschechien/);
    if (supportsTimeZoneDisplayNames()) {
      assert.match(label, /Prag/);
    } else {
      assert.match(label, /Prague/);
    }
  });

  it("localizes Prague to Praha on Czech when DisplayNames supports timeZone", () => {
    const prague = TIMEZONES_DATA.find((timezone) => timezone.value === "Europe/Prague");
    assert.ok(prague);
    const label = formatTimezoneLabel(prague, "cs-CZ");
    assert.match(label, /Česko|Česká/);
    if (supportsTimeZoneDisplayNames()) {
      assert.match(label, /Praha/);
    } else {
      assert.match(label, /Prague/);
    }
  });
});

describe("getGroupedTimezones", () => {
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
