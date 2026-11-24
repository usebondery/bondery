import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { displayContinentName, displayRegionName, displayTimeZoneCity } from "./display-names.js";

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

describe("displayRegionName", () => {
  it("returns the German name for Czechia", () => {
    assert.equal(displayRegionName("CZ", "de-DE"), "Tschechien");
  });

  it("returns the Greek name for the United States", () => {
    assert.equal(displayRegionName("US", "el-GR"), "Ηνωμένες Πολιτείες");
  });

  it("returns undefined for an empty code", () => {
    assert.equal(displayRegionName("", "de-DE"), undefined);
  });
});

describe("displayContinentName", () => {
  it("localizes Europe in German", () => {
    assert.equal(displayContinentName("Europe", "de-DE"), "Europa");
  });

  it("keeps UTC unchanged", () => {
    assert.equal(displayContinentName("UTC", "de-DE"), "UTC");
  });
});

describe("displayTimeZoneCity", () => {
  it("keeps IANA as the lookup key, not a persisted label", () => {
    const city = displayTimeZoneCity("Europe/Prague", "en-US");
    assert.ok(city);
    assert.notEqual(city, "Europe/Prague");
  });

  it("localizes Prague to Praha on Czech when DisplayNames supports timeZone", {
    skip: !supportsTimeZoneDisplayNames(),
  }, () => {
    assert.equal(displayTimeZoneCity("Europe/Prague", "cs-CZ"), "Praha");
  });

  it("falls back to Prague on Czech when DisplayNames does not support timeZone", {
    skip: supportsTimeZoneDisplayNames(),
  }, () => {
    assert.equal(displayTimeZoneCity("Europe/Prague", "cs-CZ"), "Prague");
  });

  it("returns UTC for the UTC zone", () => {
    assert.equal(displayTimeZoneCity("UTC", "cs-CZ"), "UTC");
  });
});
