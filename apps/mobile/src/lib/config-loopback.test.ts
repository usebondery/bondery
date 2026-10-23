import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  metroHostFromHostUri,
  resolveAndroidLoopbackHost,
  rewriteLoopbackHostname,
} from "./config-loopback.ts";

describe("metroHostFromHostUri", () => {
  it("reads the host from an Expo hostUri", () => {
    assert.equal(metroHostFromHostUri("192.168.1.20:26634"), "192.168.1.20");
  });

  it("reads the host from a linking URI", () => {
    assert.equal(metroHostFromHostUri("exp://192.168.1.20:26634"), "192.168.1.20");
  });
});

describe("resolveAndroidLoopbackHost", () => {
  it("uses 10.0.2.2 when Metro is on localhost", () => {
    assert.equal(resolveAndroidLoopbackHost("localhost"), "10.0.2.2");
  });

  it("uses the Metro LAN host when Expo advertises one", () => {
    assert.equal(resolveAndroidLoopbackHost("192.168.1.20"), "192.168.1.20");
  });
});

describe("rewriteLoopbackHostname", () => {
  it("rewrites localhost to the Android emulator alias", () => {
    assert.equal(
      rewriteLoopbackHostname("http://localhost:26631", "10.0.2.2"),
      "http://10.0.2.2:26631/",
    );
  });

  it("leaves a non-loopback host unchanged", () => {
    assert.equal(
      rewriteLoopbackHostname("https://api.usebondery.com", "10.0.2.2"),
      "https://api.usebondery.com",
    );
  });
});
