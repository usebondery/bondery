import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEV_URLS } from "@bondery/schemas/constants/dev-ports";

import { toMagicDnsName } from "./tailscale-host.mjs";

describe("toMagicDnsName", () => {
  it("keeps a bare MagicDNS name", () => {
    assert.equal(
      toMagicDnsName("sveetya-desktop-wsl.tailb35e0c.ts.net"),
      "sveetya-desktop-wsl.tailb35e0c.ts.net",
    );
  });

  it("strips scheme, port, and path from a Tailscale URL", () => {
    assert.equal(
      toMagicDnsName("https://sveetya-desktop-wsl.tailb35e0c.ts.net:26631/health"),
      "sveetya-desktop-wsl.tailb35e0c.ts.net",
    );
  });

  it("removes the trailing dot Tailscale puts on DNSName", () => {
    assert.equal(
      toMagicDnsName("sveetya-desktop-wsl.tailb35e0c.ts.net."),
      "sveetya-desktop-wsl.tailb35e0c.ts.net",
    );
  });

  it("lowercases the name so the hosts entry is stable", () => {
    assert.equal(
      toMagicDnsName("Sveetya-Desktop-WSL.TailB35E0C.ts.net"),
      "sveetya-desktop-wsl.tailb35e0c.ts.net",
    );
  });

  it("rejects a non-Tailscale host", () => {
    assert.equal(toMagicDnsName("localhost"), undefined);
    assert.equal(toMagicDnsName("example.com"), undefined);
  });

  it("rejects a loopback or LAN address", () => {
    assert.equal(toMagicDnsName("127.0.0.1:26631"), undefined);
    assert.equal(toMagicDnsName("http://192.168.0.101:8333"), undefined);
  });

  it("rejects a lookalike domain that only ends with ts.net", () => {
    // `evil.ts.net.attacker.com` must not pass: the suffix is not the tailnet.
    assert.equal(toMagicDnsName("evil.ts.net.attacker.com"), undefined);
    assert.equal(toMagicDnsName("http://localhost.tailb35e0c.ts.net.attacker.com/"), undefined);
  });

  it("rejects an empty value", () => {
    assert.equal(toMagicDnsName(""), undefined);
    assert.equal(toMagicDnsName(undefined), undefined);
    assert.equal(toMagicDnsName("   "), undefined);
  });
});

describe("dev URLs used by the laptop script", () => {
  it("names the website as the host to open first", () => {
    // The API answers 404 on `/`, so the website must lead.
    assert.equal(new URL(DEV_URLS.website).hostname, "usebondery.test");
  });
});
