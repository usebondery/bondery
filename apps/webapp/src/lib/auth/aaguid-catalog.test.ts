import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  AAGUID_SVG_DATA_URI_PREFIX,
  type AaguidCatalog,
  APPLE_PRIVACY_AAGUID,
  lookupAaguidCatalogName,
  lookupAaguidIcons,
  lookupAaguidIconUri,
  lookupBetterAuthAuthenticatorName,
  parseCreatedPasskey,
  resolveStoredPasskeyName,
  sanitizeAaguidCatalogDocument,
  sanitizeAaguidIconUri,
  sanitizeBetterAuthAuthenticatorNames,
  shouldAbortAaguidCatalogRefresh,
} from "./aaguid-catalog.js";

const catalogPath = join(dirname(fileURLToPath(import.meta.url)), "aaguid-catalog/aaguid.json");
const betterAuthNamesPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "aaguid-catalog/better-auth-authenticator-names.json",
);

describe("vendored AAGUID catalog", () => {
  it("is a non-empty object", () => {
    const catalog: unknown = JSON.parse(readFileSync(catalogPath, "utf8"));
    assert.equal(typeof catalog, "object");
    assert.notEqual(catalog, null);
    assert.equal(Array.isArray(catalog), false);
    assert.ok(Object.keys(catalog as object).length > 0);
  });
});

describe("shouldAbortAaguidCatalogRefresh", () => {
  it("aborts on an empty object (vendor retirement)", () => {
    assert.equal(shouldAbortAaguidCatalogRefresh({}), true);
  });

  it("does not abort on a catalog with entries", () => {
    assert.equal(shouldAbortAaguidCatalogRefresh({ "aa-bb": { name: "YubiKey" } }), false);
  });

  it("aborts on non-objects", () => {
    assert.equal(shouldAbortAaguidCatalogRefresh([]), true);
    assert.equal(shouldAbortAaguidCatalogRefresh(null), true);
    assert.equal(shouldAbortAaguidCatalogRefresh("nope"), true);
  });
});

describe("sanitizeAaguidIconUri", () => {
  it("keeps the exact SVG base64 prefix and drops everything else", () => {
    const ok = `${AAGUID_SVG_DATA_URI_PREFIX}abc`;
    assert.equal(sanitizeAaguidIconUri(ok), ok);
    assert.equal(sanitizeAaguidIconUri("data:image/svg+xml;charset=utf-8;base64,abc"), null);
    assert.equal(sanitizeAaguidIconUri("data:image/png;base64,abc"), null);
    assert.equal(sanitizeAaguidIconUri("https://example.com/icon.svg"), null);
    assert.equal(sanitizeAaguidIconUri(""), null);
  });
});

describe("sanitizeAaguidCatalogDocument", () => {
  it("lowercases AAGUID keys and drops unsanitary icons", () => {
    const catalog = sanitizeAaguidCatalogDocument({
      "EA9B8D66-4D01-1D21-3CE4-B6B48CB575D4": {
        icon_dark: "https://evil.example/icon.svg",
        icon_light: `${AAGUID_SVG_DATA_URI_PREFIX}ok`,
        name: "Google Password Manager",
      },
    });
    assert.deepEqual(catalog["ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4"], {
      icon_light: `${AAGUID_SVG_DATA_URI_PREFIX}ok`,
      name: "Google Password Manager",
    });
  });
});

describe("aaguid lookup", () => {
  const catalog: AaguidCatalog = {
    "ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4": {
      icon_dark: `${AAGUID_SVG_DATA_URI_PREFIX}dark`,
      icon_light: `${AAGUID_SVG_DATA_URI_PREFIX}light`,
      name: "Google Password Manager",
    },
  };

  it("looks up names and icons with lowercase keys", () => {
    assert.equal(
      lookupAaguidCatalogName(catalog, "EA9B8D66-4D01-1D21-3CE4-B6B48CB575D4"),
      "Google Password Manager",
    );
    assert.equal(
      lookupAaguidIconUri(catalog, "EA9B8D66-4D01-1D21-3CE4-B6B48CB575D4", "light"),
      `${AAGUID_SVG_DATA_URI_PREFIX}light`,
    );
    assert.equal(
      lookupAaguidIconUri(catalog, "EA9B8D66-4D01-1D21-3CE4-B6B48CB575D4", "dark"),
      `${AAGUID_SVG_DATA_URI_PREFIX}dark`,
    );
    assert.deepEqual(lookupAaguidIcons(catalog, "EA9B8D66-4D01-1D21-3CE4-B6B48CB575D4"), {
      iconDark: `${AAGUID_SVG_DATA_URI_PREFIX}dark`,
      iconLight: `${AAGUID_SVG_DATA_URI_PREFIX}light`,
    });
  });
});

describe("resolveStoredPasskeyName", () => {
  const template = ({ browser, os }: { browser: string; os: string }) => `${browser} on ${os}`;
  const catalog: AaguidCatalog = {
    "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee": { name: "Catalog Authenticator" },
  };

  it("uses the catalog name when the AAGUID is listed", async () => {
    assert.equal(
      await resolveStoredPasskeyName({
        aaguid: "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE",
        catalog,
        fallback: "Passkey",
        template,
      }),
      "Catalog Authenticator",
    );
  });

  it("uses the Better Auth map when the catalog misses", async () => {
    assert.equal(
      await resolveStoredPasskeyName({
        aaguid: "bada5566-a7aa-401f-bd96-45619a55120d",
        catalog,
        fallback: "Passkey",
        template,
      }),
      "1Password",
    );
  });

  it("treats the Apple privacy AAGUID as a miss and uses the UA fallback", async () => {
    assert.equal(
      await resolveStoredPasskeyName({
        aaguid: APPLE_PRIVACY_AAGUID,
        catalog: {
          ...catalog,
          [APPLE_PRIVACY_AAGUID]: { name: "Should not win" },
        },
        fallback: "Passkey",
        template,
      }),
      "Passkey",
    );
  });
});

describe("parseCreatedPasskey", () => {
  it("reads id and aaguid from unknown data", () => {
    assert.deepEqual(parseCreatedPasskey({ aaguid: "ea9b-aa", id: "pk_1" }), {
      aaguid: "ea9b-aa",
      id: "pk_1",
    });
    assert.equal(parseCreatedPasskey({ aaguid: "ea9b-aa" }), null);
    assert.deepEqual(parseCreatedPasskey({ id: "pk_1" }), { aaguid: null, id: "pk_1" });
  });
});

describe("vendored Better Auth authenticator names", () => {
  it("is a non-empty AAGUID-to-name map", () => {
    const names: unknown = JSON.parse(readFileSync(betterAuthNamesPath, "utf8"));
    assert.equal(typeof names, "object");
    assert.notEqual(names, null);
    assert.equal(Array.isArray(names), false);
    const keys = Object.keys(names as object);
    assert.ok(keys.length > 0);
    assert.equal(
      (names as Record<string, string>)["bada5566-a7aa-401f-bd96-45619a55120d"],
      "1Password",
    );
  });
});

describe("sanitizeBetterAuthAuthenticatorNames", () => {
  it("lowercases keys, trims names, and drops the Apple privacy AAGUID", () => {
    assert.deepEqual(
      sanitizeBetterAuthAuthenticatorNames({
        "": "empty key",
        [APPLE_PRIVACY_AAGUID]: "Apple",
        "BADA5566-A7AA-401F-BD96-45619A55120D": " 1Password ",
        nope: 1,
      }),
      { "bada5566-a7aa-401f-bd96-45619a55120d": "1Password" },
    );
  });
});

describe("lookupBetterAuthAuthenticatorName", () => {
  it("misses null, empty, and zero AAGUIDs", () => {
    assert.equal(lookupBetterAuthAuthenticatorName(null), null);
    assert.equal(lookupBetterAuthAuthenticatorName(""), null);
    assert.equal(lookupBetterAuthAuthenticatorName(APPLE_PRIVACY_AAGUID), null);
  });
});
