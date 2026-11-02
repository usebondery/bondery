import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { discoveryCorsPreflight, withDiscoveryCors } from "./discovery-cors.js";

describe("discovery document CORS", () => {
  it("adds the cross-origin headers required for public discovery", () => {
    const headers = withDiscoveryCors({ "Content-Type": "application/json" });

    assert.equal(headers["Access-Control-Allow-Origin"], "*");
    assert.equal(headers["Access-Control-Allow-Methods"], "GET");
    assert.equal(headers["Access-Control-Allow-Headers"], "Content-Type, If-None-Match");
    assert.equal(headers["Access-Control-Expose-Headers"], "ETag");
    assert.equal(headers["Content-Type"], "application/json");
  });

  it("keeps caller headers", () => {
    const headers = withDiscoveryCors({ "Cache-Control": "max-age=86400" });

    assert.equal(headers["Cache-Control"], "max-age=86400");
    assert.equal(headers["Access-Control-Allow-Origin"], "*");
  });

  it("answers preflight with 204 and no body", async () => {
    const response = discoveryCorsPreflight();

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
    assert.equal(response.headers.get("Access-Control-Allow-Methods"), "GET");
    assert.equal(await response.text(), "");
  });
});
