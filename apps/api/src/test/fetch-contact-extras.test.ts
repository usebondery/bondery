import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getEmptyContactExtras,
  parseContactExtrasRpcResult,
} from "../lib/contacts/fetch-contact-extras.js";

describe("parseContactExtrasRpcResult", () => {
  it("parses phones, emails, addresses, and socials per person", () => {
    const map = parseContactExtrasRpcResult({
      "person-1": {
        addresses: [
          {
            addressCity: "Prague",
            addressCountry: "Czechia",
            addressCountryCode: "CZ",
            addressFormatted: "123 Main St, Prague",
            addressGeocodeSource: "mapy.com",
            addressGranularity: "address",
            addressLine1: "123 Main St",
            addressLine2: null,
            addressPostalCode: "11000",
            addressState: null,
            addressStateCode: null,
            geocodeConfidence: "verified",
            label: "Home",
            latitude: 50.1,
            longitude: 14.4,
            timezone: "Europe/Prague",
            type: "home",
            value: "123 Main St",
          },
        ],
        emails: [{ preferred: false, type: "work", value: "ada@example.com" }],
        facebook: null,
        instagram: null,
        linkedin: "ada-lovelace",
        phones: [{ preferred: true, prefix: "+1", type: "home", value: "5551234" }],
        signal: null,
        website: null,
        whatsapp: null,
      },
    });

    const extras = map.get("person-1");
    assert.ok(extras);
    assert.equal(extras.phones.length, 1);
    assert.equal(extras.emails[0]?.value, "ada@example.com");
    assert.equal(extras.addresses[0]?.addressCity, "Prague");
    assert.equal(extras.linkedin, "ada-lovelace");
  });

  it("returns empty map for invalid root", () => {
    assert.equal(parseContactExtrasRpcResult(null).size, 0);
    assert.equal(parseContactExtrasRpcResult([]).size, 0);
  });

  it("getEmptyContactExtras returns stable empty shape", () => {
    const empty = getEmptyContactExtras();
    assert.deepEqual(empty.phones, []);
    assert.equal(empty.linkedin, null);
  });
});
