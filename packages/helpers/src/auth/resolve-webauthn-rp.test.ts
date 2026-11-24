import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveWebAuthnRp } from "./resolve-webauthn-rp.js";

describe("resolveWebAuthnRp", () => {
  it("uses parent domain as rpID for the hosted webapp", () => {
    const result = resolveWebAuthnRp({ webappUrl: "https://app.usebondery.com" });
    assert.deepEqual(result, {
      ok: true,
      origin: "https://app.usebondery.com",
      rpID: "usebondery.com",
    });
  });

  it("preserves localhost port on origin and uses rpID localhost", () => {
    const result = resolveWebAuthnRp({ webappUrl: "http://localhost:26632" });
    assert.deepEqual(result, {
      ok: true,
      origin: "http://localhost:26632",
      rpID: "localhost",
    });
  });

  it("uses the hostname as rpID for a two-label self-host origin", () => {
    const result = resolveWebAuthnRp({ webappUrl: "https://bondery.example.com" });
    assert.deepEqual(result, {
      ok: true,
      origin: "https://bondery.example.com",
      rpID: "example.com",
    });
  });

  it("strips a trailing slash from origin", () => {
    const result = resolveWebAuthnRp({ webappUrl: "https://app.usebondery.com/" });
    assert.deepEqual(result, {
      ok: true,
      origin: "https://app.usebondery.com",
      rpID: "usebondery.com",
    });
  });

  it("refuses 127.0.0.1 because WebAuthn rpID cannot be an IP", () => {
    const result = resolveWebAuthnRp({ webappUrl: "http://127.0.0.1:26632" });
    assert.deepEqual(result, { ok: false, reason: "ip_hostname" });
  });

  it("refuses IPv6 hosts", () => {
    const result = resolveWebAuthnRp({ webappUrl: "http://[::1]:26632" });
    assert.deepEqual(result, { ok: false, reason: "ip_hostname" });
  });

  it("returns missing_webapp_url for empty input", () => {
    assert.deepEqual(resolveWebAuthnRp({ webappUrl: undefined }), {
      ok: false,
      reason: "missing_webapp_url",
    });
    assert.deepEqual(resolveWebAuthnRp({ webappUrl: "   " }), {
      ok: false,
      reason: "missing_webapp_url",
    });
  });

  it("returns invalid_webapp_url for unparseable input", () => {
    const result = resolveWebAuthnRp({ webappUrl: "not a url" });
    assert.deepEqual(result, { ok: false, reason: "invalid_webapp_url" });
  });

  it("applies an optional rpID override without changing origin", () => {
    const result = resolveWebAuthnRp({
      rpIdOverride: "auth.internal.example",
      webappUrl: "https://crm.ugly-dns.example",
    });
    assert.deepEqual(result, {
      ok: true,
      origin: "https://crm.ugly-dns.example",
      rpID: "auth.internal.example",
    });
  });

  it("refuses an IP rpID override", () => {
    const result = resolveWebAuthnRp({
      rpIdOverride: "127.0.0.1",
      webappUrl: "https://app.usebondery.com",
    });
    assert.deepEqual(result, { ok: false, reason: "invalid_rp_id_override" });
  });

  it("does not use BONDERY_PUBLIC_API_URL even when it is set", () => {
    const previous = process.env["BONDERY_PUBLIC_API_URL"];
    process.env["BONDERY_PUBLIC_API_URL"] = "https://api.usebondery.com";
    try {
      const result = resolveWebAuthnRp({ webappUrl: "https://app.usebondery.com" });
      assert.deepEqual(result, {
        ok: true,
        origin: "https://app.usebondery.com",
        rpID: "usebondery.com",
      });
    } finally {
      if (previous === undefined) {
        delete process.env["BONDERY_PUBLIC_API_URL"];
      } else {
        process.env["BONDERY_PUBLIC_API_URL"] = previous;
      }
    }
  });

  it("does not treat the marketing website as origin when webapp URL is passed", () => {
    const result = resolveWebAuthnRp({ webappUrl: "https://app.usebondery.com" });
    assert.deepEqual(result, {
      ok: true,
      origin: "https://app.usebondery.com",
      rpID: "usebondery.com",
    });
  });

  it("never reads BONDERY_PUBLIC_API_URL when the webapp origin is localhost", () => {
    const previous = process.env["BONDERY_PUBLIC_API_URL"];
    process.env["BONDERY_PUBLIC_API_URL"] = "https://api.usebondery.com";
    try {
      const result = resolveWebAuthnRp({ webappUrl: "http://localhost:26632" });
      assert.deepEqual(result, {
        ok: true,
        origin: "http://localhost:26632",
        rpID: "localhost",
      });
    } finally {
      if (previous === undefined) {
        delete process.env["BONDERY_PUBLIC_API_URL"];
      } else {
        process.env["BONDERY_PUBLIC_API_URL"] = previous;
      }
    }
  });
});
