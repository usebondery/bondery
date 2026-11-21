import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  compareTelephonePrefixByDialDigits,
  findTelephonePrefixOption,
  localizeTelephonePrefixLabel,
  TELEPHONE_PREFIX_OPTIONS,
} from "./prefix-options.js";

describe("findTelephonePrefixOption", () => {
  it("matches canonical dial codes for NANP territories", () => {
    const antigua = findTelephonePrefixOption("+1268");
    assert.equal(antigua?.countryCode, "AG");
    assert.equal(antigua?.displayPrefix, "+1 268");
  });

  it("accepts legacy hyphenated dial codes", () => {
    const antigua = findTelephonePrefixOption("+1-268");
    assert.equal(antigua?.value, "+1268");
    assert.equal(antigua?.displayPrefix, "+1 268");
  });
});

describe("localizeTelephonePrefixLabel", () => {
  it("uses the UI locale for the country name", () => {
    const czechia = TELEPHONE_PREFIX_OPTIONS.find((option) => option.countryCode === "CZ");
    assert.ok(czechia);
    assert.equal(localizeTelephonePrefixLabel(czechia, "de-DE"), "Tschechien");
  });
});

describe("telephone prefix options order", () => {
  it("sorts by dial digits lexicographically", () => {
    assert.ok(compareTelephonePrefixByDialDigits("+420", "+43") < 0);

    const index420 = TELEPHONE_PREFIX_OPTIONS.findIndex((option) => option.value === "+420");
    const index43 = TELEPHONE_PREFIX_OPTIONS.findIndex((option) => option.value === "+43");
    assert.ok(index420 >= 0 && index43 >= 0);
    assert.ok(index420 < index43);
  });
});
