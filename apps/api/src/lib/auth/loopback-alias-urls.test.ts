import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveMcpPluginResource, resolveMcpResourceIdentifiers } from "./auth-public.js";
import { isLoopbackHostname, withLoopbackUrlAlias } from "./loopback-alias-urls.js";

describe("withLoopbackUrlAlias", () => {
  it("pairs localhost with 127.0.0.1 and keeps the canonical first", () => {
    assert.deepEqual(withLoopbackUrlAlias("http://localhost:26631/"), [
      "http://localhost:26631",
      "http://127.0.0.1:26631",
    ]);
  });

  it("pairs 127.0.0.1 with localhost", () => {
    assert.deepEqual(withLoopbackUrlAlias("http://127.0.0.1:26631"), [
      "http://127.0.0.1:26631",
      "http://localhost:26631",
    ]);
  });

  it("leaves production hosts unchanged", () => {
    assert.deepEqual(withLoopbackUrlAlias("https://api.usebondery.com"), [
      "https://api.usebondery.com",
    ]);
  });

  it("keeps a non-root pathname on the loopback alias (MCP /mcp)", () => {
    assert.deepEqual(withLoopbackUrlAlias("http://localhost:26631/mcp"), [
      "http://localhost:26631/mcp",
      "http://127.0.0.1:26631/mcp",
    ]);
  });
});

describe("isLoopbackHostname", () => {
  it("accepts localhost and 127/8", () => {
    assert.equal(isLoopbackHostname("localhost"), true);
    assert.equal(isLoopbackHostname("127.0.0.1"), true);
    assert.equal(isLoopbackHostname("host.tailnet.ts.net"), false);
  });
});

describe("resolveMcpPluginResource", () => {
  function withApiUrl(url: string, run: () => void) {
    const previous = process.env.BONDERY_PUBLIC_API_URL;
    process.env.BONDERY_PUBLIC_API_URL = url;
    try {
      run();
    } finally {
      if (previous === undefined) {
        delete process.env.BONDERY_PUBLIC_API_URL;
      } else {
        process.env.BONDERY_PUBLIC_API_URL = previous;
      }
    }
  }

  it("keeps HTTPS MCP resources", () => {
    withApiUrl("https://api.usebondery.com", () => {
      assert.equal(resolveMcpPluginResource(), "https://api.usebondery.com/mcp");
    });
  });

  it("keeps loopback HTTP MCP resources", () => {
    withApiUrl("http://localhost:26631", () => {
      assert.equal(resolveMcpPluginResource(), "http://localhost:26631/mcp");
    });
  });

  it("maps Tailscale HTTP API URLs to loopback for mcp()", () => {
    withApiUrl("http://dev-host.tailnet.ts.net:26631", () => {
      assert.equal(resolveMcpPluginResource(), "http://127.0.0.1:26631/mcp");
    });
  });

  it("includes the plugin resource in MCP identifiers", () => {
    withApiUrl("http://dev-host.tailnet.ts.net:26631", () => {
      assert.deepEqual(resolveMcpResourceIdentifiers(), [
        "http://dev-host.tailnet.ts.net:26631/mcp",
        "http://127.0.0.1:26631/mcp",
      ]);
    });
  });
});
