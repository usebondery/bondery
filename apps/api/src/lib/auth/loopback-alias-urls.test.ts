import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withLoopbackUrlAlias } from "./loopback-alias-urls.js";

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
