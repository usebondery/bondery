import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getCountryCodeForTimezone } from "#phone/phone-default-country.js";
import {
  canonicalizeDialCode,
  countryToCallingCode,
  formatDialCodeForDisplay,
  normalizePhoneInput,
  normalizePhoneParts,
  phoneIdentityKey,
  resolveDefaultPhoneCountry,
  resolveTelephonePaste,
} from "#phone/phone-normalize.js";
import { parsePhoneNumber } from "#phone/phone-utils.js";

describe("normalizePhoneInput", () => {
  it("parses US national number with default US", () => {
    const result = normalizePhoneInput("123-456-7899", { defaultCountry: "US" });
    assert.ok(!("error" in result));
    assert.equal(result.prefix, "+1");
    assert.equal(result.value, "1234567899");
    assert.equal(result.identityKey, "11234567899");
  });

  it("parses Czech national number with default CZ", () => {
    const result = normalizePhoneInput("601 123 456", { defaultCountry: "CZ" });
    assert.ok(!("error" in result));
    assert.equal(result.prefix, "+420");
    assert.equal(result.value, "601123456");
  });

  it("strips leading trunk zero for CZ national input", () => {
    const result = normalizePhoneInput("0601123456", { defaultCountry: "CZ" });
    assert.ok(!("error" in result));
    assert.equal(result.value, "601123456");
  });

  it("parses explicit international +420", () => {
    const result = normalizePhoneInput("+420 601 123 456", { defaultCountry: "US" });
    assert.ok(!("error" in result));
    assert.equal(result.prefix, "+420");
    assert.equal(result.value, "601123456");
  });

  it("parses 00 international prefix", () => {
    const result = normalizePhoneInput("00420 601 123 456", { defaultCountry: "US" });
    assert.ok(!("error" in result));
    assert.equal(result.prefix, "+420");
    assert.equal(result.value, "601123456");
  });

  it("does not treat US national as +1 international (Plane bug)", () => {
    const greedy = parsePhoneNumber("123-456-7899");
    assert.equal(greedy, null);

    const withDefault = parsePhoneNumber("123-456-7899", "US");
    assert.deepEqual(withDefault, { dialCode: "+1", number: "1234567899" });
  });
});

describe("resolveTelephonePaste", () => {
  it("returns null for empty paste", () => {
    assert.equal(resolveTelephonePaste(""), null);
  });

  it("parses international paste", () => {
    const parsed = resolveTelephonePaste("+420 601 123 456", { defaultCountry: "US" });
    assert.deepEqual(parsed, {
      identityKey: "420601123456",
      prefix: "+420",
      value: "601123456",
    });
  });
});

describe("normalizePhoneParts", () => {
  it("uses selected prefix for national digits", () => {
    const result = normalizePhoneParts("+420", "601123456", { defaultCountry: "US" });
    assert.ok(!("error" in result));
    assert.equal(result.prefix, "+420");
    assert.equal(result.value, "601123456");
  });

  it("reinterprets pasted E.164 digits when prefix is wrong (+1)", () => {
    const result = normalizePhoneParts("+1", "420601123456", { defaultCountry: "US" });
    assert.ok(!("error" in result));
    assert.equal(result.prefix, "+420");
    assert.equal(result.value, "601123456");
  });
});

describe("phone helpers", () => {
  it("countryToCallingCode maps ISO to dial code", () => {
    assert.equal(countryToCallingCode("cz"), "+420");
    assert.equal(countryToCallingCode("US"), "+1");
  });

  it("phoneIdentityKey is digits-only E.164", () => {
    assert.equal(phoneIdentityKey("+1", "234-567-8999"), "12345678999");
  });

  it("resolveDefaultPhoneCountry prefers explicit setting", () => {
    assert.equal(
      resolveDefaultPhoneCountry({ defaultPhoneCountry: "CZ", timezone: "America/New_York" }),
      "CZ",
    );
  });

  it("getCountryCodeForTimezone returns null for UTC", () => {
    assert.equal(getCountryCodeForTimezone("UTC"), null);
    assert.equal(getCountryCodeForTimezone("Europe/Prague"), "CZ");
  });

  it("canonicalizeDialCode normalizes hyphenated NANP codes", () => {
    assert.equal(canonicalizeDialCode("+1-268"), "+1268");
    assert.equal(formatDialCodeForDisplay("+1-268"), "+1 268");
  });
});
