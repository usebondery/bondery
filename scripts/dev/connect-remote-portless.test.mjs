import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEV_URLS } from "@bondery/schemas/constants/dev-ports";

import {
  inferSshUser,
  magicDnsName,
  pickLinuxDevNode,
  portlessHttpsHostnames,
  resolveRemoteSshTarget,
} from "./connect-remote-portless.mjs";

describe("portlessHttpsHostnames", () => {
  it("lists every HTTPS .test host from DEV_URLS", () => {
    assert.deepEqual(portlessHttpsHostnames(DEV_URLS), [
      "api.usebondery.test",
      "app.usebondery.test",
      "mail.usebondery.test",
      "usebondery.test",
    ]);
  });

  it("skips http loopback URLs", () => {
    assert.deepEqual(
      portlessHttpsHostnames({
        api: "https://api.usebondery.test",
        mobile: "http://localhost:26634",
        website: "https://usebondery.test",
      }),
      ["api.usebondery.test", "usebondery.test"],
    );
  });
});

describe("resolveRemoteSshTarget", () => {
  it("strips the trailing MagicDNS dot", () => {
    assert.equal(
      magicDnsName("sveetya-desktop-wsl.tailb35e0c.ts.net."),
      "sveetya-desktop-wsl.tailb35e0c.ts.net",
    );
  });

  it("infers the unix user from the Tailscale hostname", () => {
    assert.equal(
      inferSshUser("sveetya-desktop", "sveetya-desktop-wsl.tailb35e0c.ts.net"),
      "sveetya",
    );
  });

  it("uses this node when Tailscale Self is Linux", () => {
    assert.equal(
      resolveRemoteSshTarget({
        Self: {
          DNSName: "sveetya-desktop-wsl.tailb35e0c.ts.net.",
          HostName: "sveetya-desktop",
          OS: "linux",
        },
      }),
      "sveetya@sveetya-desktop-wsl.tailb35e0c.ts.net",
    );
  });

  it("picks the online Linux peer from a Windows laptop", () => {
    assert.equal(
      resolveRemoteSshTarget({
        Peer: {
          a: {
            DNSName: "sveetyas-phone.tailb35e0c.ts.net.",
            HostName: "Sveetya's phone",
            Online: true,
            OS: "android",
          },
          b: {
            DNSName: "sveetya-desktop.tailb35e0c.ts.net.",
            HostName: "sveetya-desktop",
            Online: false,
            OS: "windows",
          },
          c: {
            DNSName: "sveetya-desktop-wsl.tailb35e0c.ts.net.",
            HostName: "sveetya-desktop",
            Online: true,
            OS: "linux",
          },
        },
        Self: {
          DNSName: "sveetya-laptop.tailb35e0c.ts.net.",
          HostName: "sveetya-laptop",
          OS: "windows",
        },
      }),
      "sveetya@sveetya-desktop-wsl.tailb35e0c.ts.net",
    );
  });

  it("prefers a WSL peer when several Linux nodes are online", () => {
    const node = pickLinuxDevNode([
      { DNSName: "buildbox.tailb35e0c.ts.net.", HostName: "buildbox" },
      { DNSName: "sveetya-desktop-wsl.tailb35e0c.ts.net.", HostName: "sveetya-desktop" },
    ]);
    assert.equal(magicDnsName(node.DNSName), "sveetya-desktop-wsl.tailb35e0c.ts.net");
  });

  it("honors BONDERY_DEV_SSH_USER", () => {
    assert.equal(
      resolveRemoteSshTarget(
        {
          Self: {
            DNSName: "sveetya-desktop-wsl.tailb35e0c.ts.net.",
            HostName: "sveetya-desktop",
            OS: "linux",
          },
        },
        "other",
      ),
      "other@sveetya-desktop-wsl.tailb35e0c.ts.net",
    );
  });
});
